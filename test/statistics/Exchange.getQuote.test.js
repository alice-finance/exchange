const Exchange = artifacts.require("./mock/ExchangeMock.sol");
const Statistics = artifacts.require("./statistics/Statistics.sol");
const ERC20Proxy = artifacts.require("./proxy/ERC20Proxy.sol");
const ERC721Proxy = artifacts.require("./proxy/ERC721Proxy.sol");
const ERC20 = artifacts.require("./mock/ERC20Mock.sol");
const ERC721 = artifacts.require("./mock/ERC721Mock.sol");

const { BN, time } = require("openzeppelin-test-helpers");
const { expect } = require("chai");
const { performance } = require("perf_hooks");

const SIG_ORDER_CREATED = "0xbd47c557d46a8fa286d10778547accc8ee2803cbaa0b366b093271369cd57275"; //keccak256("OrderCreated(uint256,address,bytes4,address,uint256,bytes,bytes4,address,uint256,bytes,uint256)");
const SIG_ORDER_FILLED = "0x8bab5121105c1470f66ada0801bfafc6928c682fadc7792d126cde7b9826059c"; //keccak256("OrderFilled(nonce,address,address,address,uint256,uint8,uint256)");
const SIG_ORDER_CANCELLED = "0xa4bb54ffb7bcc3eb7bdd81e41ad340b367a9b3a7416cd7764e68713a274c9da3"; //keccak256("OrderCancelled(uint256,address,address,uint256)");

contract("Statistics.getQuote", function([admin, owner, maker, taker]) {
  const LIMIT = new BN("2", 10).pow(new BN("128", 10)).sub(new BN("1"));
  const ERC20_PROXY_ID = "0xcc4aa204";
  const ERC721_PROXY_ID = "0x9013e617";
  const MIN_QUOTE_TIME = new BN("60");
  const erc20AskValue = new BN("1000000");

  async function initializeExchange(exchange, owner) {
    const signature = "initialize(address)";
    const args = [owner];
    await exchange.methods[signature](...args, { from: admin });
  }

  async function createOrder(context, askAssetAmount, bidAssetAmount) {
    if (!web3.utils.isBN(askAssetAmount)) {
      askAssetAmount = web3.utils.toBN(askAssetAmount);
    }

    if (!web3.utils.isBN(bidAssetAmount)) {
      bidAssetAmount = web3.utils.toBN(bidAssetAmount);
    }

    await context.exchange.createOrder(
      {
        askAssetProxyId: ERC20_PROXY_ID,
        askAssetAddress: context.erc20Ask.address,
        askAssetAmount: askAssetAmount.toString(),
        askAssetData: "0x00",
        bidAssetProxyId: ERC20_PROXY_ID,
        bidAssetAddress: context.erc20Bid.address,
        bidAssetAmount: bidAssetAmount.toString(),
        bidAssetData: "0x00",
        feeAmount: 0
      },
      { from: maker }
    );
  }

  async function fillOrder(context, nonce, amountToFill, timestamp) {
    if (!web3.utils.isBN(amountToFill)) {
      amountToFill = web3.utils.toBN(amountToFill);
    }
    await context.exchange.fillOrderMock(
      {
        askAssetAddress: context.erc20Ask.address,
        bidAssetAddress: context.erc20Bid.address,
        nonce: nonce,
        bidAssetAmountToFill: amountToFill.toString(),
        feeAmount: 0
      },
      timestamp,
      { from: taker }
    );
  }

  before(async function() {
    this.exchange = await Exchange.new({ from: admin });
    await initializeExchange(this.exchange, owner);
    this.statistics = await Statistics.new({ from: admin });
    await this.exchange.addSubscriber(SIG_ORDER_CREATED, this.statistics.address, { from: owner });
    await this.exchange.addSubscriber(SIG_ORDER_FILLED, this.statistics.address, { from: owner });
    await this.exchange.addSubscriber(SIG_ORDER_CANCELLED, this.statistics.address, { from: owner });

    this.erc20Proxy = await ERC20Proxy.new({ from: admin });
    this.erc721Proxy = await ERC721Proxy.new({ from: admin });

    await this.exchange.registerAssetProxy(ERC20_PROXY_ID, this.erc20Proxy.address, { from: owner });
    await this.exchange.registerAssetProxy(ERC721_PROXY_ID, this.erc721Proxy.address, { from: owner });

    this.erc20Ask = await ERC20.new("ERC20 Ask", "E20A", 18, { from: admin });
    this.erc721Ask = await ERC721.new("ERC721 Ask", "E721A", { from: admin });
    this.erc20Bid = await ERC20.new("ERC20 Bid", "E20B", 18, { from: admin });
    this.erc721Bid = await ERC721.new("ERC721 Bid", "E721B", { from: admin });

    await this.erc20Ask.mint(maker, LIMIT, { from: admin });
    await this.erc20Bid.mint(taker, LIMIT, { from: admin });
    await this.erc20Ask.approve(this.erc20Proxy.address, LIMIT, { from: maker });
    await this.erc20Bid.approve(this.erc20Proxy.address, LIMIT, { from: taker });

    await createOrder(this, erc20AskValue, 3000000);
    await createOrder(this, erc20AskValue, 6000000);
    await createOrder(this, erc20AskValue, 2000000);
    await createOrder(this, erc20AskValue, 7000000);
    await createOrder(this, erc20AskValue, 4000000);
    await createOrder(this, erc20AskValue, 5000000);
  });

  it("no fills", async function() {
    let result = await this.statistics.getQuotes(this.erc20Ask.address, this.erc20Bid.address, 0, 0, 0);

    expect(result.length).to.be.equal(60);
    result.forEach(quote => {
      expect(quote.volume).to.be.equal("0");
    });
  });

  context("on ethereum node", function() {
    before(async function() {
      let timeAdjustment = new BN("3600");
      let now = await time.latest();
      now = now.sub(now.mod(timeAdjustment)).add(timeAdjustment);

      let timeToExpend = now.add(timeAdjustment);
      let t0 = performance.now();
      const amount = 100;
      let promises = [];

      for (let i = 0; now.lt(timeToExpend); now = now.add(time.duration.seconds(5)), i++) {
        // console.log(`Fill ${i % 6} with ${amount} at ${now}`);
        let promise = fillOrder(this, i % 6, amount, now); // 20000
        promises.push(promise);
      }

      await Promise.all(promises);

      let t1 = performance.now();
      console.log("Preparing data took " + (t1 - t0) + " milliseconds.");
    });

    it("should get quote 60", async function() {
      let result = await this.statistics.getQuotes(
        this.erc20Ask.address,
        this.erc20Bid.address,
        (await time.latest()).sub(time.duration.seconds(60)),
        0,
        MIN_QUOTE_TIME
      );

      console.log(result);
      expect(result.length).to.be.equal(1);
    });

    it("should get quote 180", async function() {
      let result = await this.statistics.getQuotes(
        this.erc20Ask.address,
        this.erc20Bid.address,
        (await time.latest()).sub(time.duration.seconds(180)),
        0,
        MIN_QUOTE_TIME
      );

      console.log(result);
      expect(result.length).to.be.equal(3);
    });

    it("should get quote 300", async function() {
      let result = await this.statistics.getQuotes(
        this.erc20Ask.address,
        this.erc20Bid.address,
        (await time.latest()).sub(time.duration.seconds(300)),
        0,
        MIN_QUOTE_TIME
      );

      console.log(result);
      expect(result.length).to.be.equal(5);
    });

    it("should get quote 900", async function() {
      let result = await this.statistics.getQuotes(
        this.erc20Ask.address,
        this.erc20Bid.address,
        (await time.latest()).sub(time.duration.seconds(900)),
        0,
        MIN_QUOTE_TIME
      );

      console.log(result);
      expect(result.length).to.be.equal(15);
    });

    it("should get quote 1800", async function() {
      let result = await this.statistics.getQuotes(
        this.erc20Ask.address,
        this.erc20Bid.address,
        (await time.latest()).sub(time.duration.seconds(1800)),
        0,
        MIN_QUOTE_TIME
      );

      console.log(result);
      expect(result.length).to.be.equal(30);
    });

    it("should get quote 3600", async function() {
      let result = await this.statistics.getQuotes(
        this.erc20Ask.address,
        this.erc20Bid.address,
        (await time.latest()).sub(time.duration.seconds(3600)),
        0,
        MIN_QUOTE_TIME
      );

      console.log(result);
      expect(result.length).to.be.equal(60);
    });

    context("should adjust timeFrom and timeTo", async function() {
      it("1 hour", async function() {
        let now = await time.latest();
        let result = await this.statistics.getQuotes(this.erc20Ask.address, this.erc20Bid.address, 0, now, 0);

        console.log(result);
        expect(result.length).to.be.equal(60);
        expect(result[0].timeOpen).to.be.equal(
          now
            .sub(now.mod(new BN("60")))
            .sub(new BN("3600"))
            .toString()
        );
        expect(result[59].timeClose).to.be.equal(
          now
            .sub(now.mod(new BN("60")))
            .sub(new BN("1"))
            .toString()
        );
      });
    });
  });

  context.skip("on plasma node", function() {
    context("range", async function() {
      before(async function() {
        let timeToExpend = MIN_QUOTE_TIME.mul(new BN("3")).toNumber();
        for (i = 0; i < timeToExpend; i++) {
          await fillOrder(this, i % 6, 100); // 20000
        }
      });

      it("should get quote 60", async function() {
        let result = await this.statistics.getQuotes(
          this.erc20Ask.address,
          this.erc20Bid.address,
          (await time.latest()).sub(time.duration.seconds(60)),
          0,
          0
        );

        console.log(result);
        expect(result.length).to.be.equal(1);
      });

      it("should get quote 120", async function() {
        let result = await this.statistics.getQuotes(
          this.erc20Ask.address,
          this.erc20Bid.address,
          0,
          (await time.latest()).sub(time.duration.seconds(60)),
          MIN_QUOTE_TIME
        );

        console.log(result);
        expect(result.length).to.be.equal(59);
      });

      it("should get quote 180", async function() {
        let result = await this.statistics.getQuotes(
          this.erc20Ask.address,
          this.erc20Bid.address,
          (await time.latest()).sub(time.duration.seconds(120)),
          (await time.latest()).sub(time.duration.seconds(60)),
          MIN_QUOTE_TIME
        );

        console.log(result);
        expect(result.length).to.be.equal(1);
      });
    });
  });
});
