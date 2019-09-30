const Exchange = artifacts.require("./exchange/Exchange.sol");
const ERC20Proxy = artifacts.require("./proxy/ERC20Proxy.sol");
const ERC721Proxy = artifacts.require("./proxy/ERC721Proxy.sol");
const ERC20 = artifacts.require("./mock/ERC20Mock.sol");
const ERC721 = artifacts.require("./mock/ERC721Mock.sol");

const { BN, time, constants } = require("openzeppelin-test-helpers");
const { expect } = require("chai");
const { ZERO_ADDRESS } = constants;

contract("Exchange.orderFills", function([admin, owner, maker1, maker2, maker3, taker1, taker2, taker3]) {
  const LIMIT = new BN("2", 10).pow(new BN("128", 10)).sub(new BN("1"));
  const ERC20_PROXY_ID = "0xcc4aa204";
  const ERC721_PROXY_ID = "0x9013e617";
  const erc20AskValue = new BN("10000");
  const erc20BidValue = new BN("300000");

  async function initializeExchange(exchange, owner) {
    const signature = "initialize(address)";
    const args = [owner];
    await exchange.methods[signature](...args, { from: admin });
  }

  before(async function() {
    this.exchange = await Exchange.new({ from: admin });
    await initializeExchange(this.exchange, owner);

    this.erc20Proxy = await ERC20Proxy.new({ from: admin });
    this.erc721Proxy = await ERC721Proxy.new({ from: admin });

    await this.exchange.registerAssetProxy(ERC20_PROXY_ID, this.erc20Proxy.address, { from: owner });
    await this.exchange.registerAssetProxy(ERC721_PROXY_ID, this.erc721Proxy.address, { from: owner });

    this.erc20Ask = await ERC20.new("ERC20 Ask", "E20A", 18, { from: admin });
    this.erc721Ask = await ERC721.new("ERC721 Ask", "E721A", { from: admin });
    this.erc20Bid = await ERC20.new("ERC20 Bid", "E20B", 18, { from: admin });
    this.erc721Bid = await ERC721.new("ERC721 Bid", "E721B", { from: admin });

    await this.erc20Ask.mint(maker1, erc20AskValue, { from: admin });
    await this.erc20Ask.mint(maker2, erc20AskValue, { from: admin });
    await this.erc20Ask.mint(maker3, erc20AskValue, { from: admin });
    await this.erc20Bid.mint(taker1, erc20BidValue, { from: admin });
    await this.erc20Bid.mint(taker2, erc20BidValue, { from: admin });
    await this.erc20Bid.mint(taker3, erc20BidValue, { from: admin });
    await this.erc20Ask.approve(this.erc20Proxy.address, LIMIT, { from: maker1 });
    await this.erc20Ask.approve(this.erc20Proxy.address, LIMIT, { from: maker2 });
    await this.erc20Ask.approve(this.erc20Proxy.address, LIMIT, { from: maker3 });
    await this.erc20Bid.approve(this.erc20Proxy.address, LIMIT, { from: taker1 });
    await this.erc20Bid.approve(this.erc20Proxy.address, LIMIT, { from: taker2 });
    await this.erc20Bid.approve(this.erc20Proxy.address, LIMIT, { from: taker3 });

    await this.exchange.createOrder(
      {
        askAssetProxyId: ERC20_PROXY_ID,
        askAssetAddress: this.erc20Ask.address,
        askAssetAmount: erc20AskValue.toString(),
        askAssetData: "0x00",
        bidAssetProxyId: ERC20_PROXY_ID,
        bidAssetAddress: this.erc20Bid.address,
        bidAssetAmount: new BN("10000").toString(),
        bidAssetData: "0x00",
        feeAmount: 0
      },
      { from: maker1 }
    );

    await this.exchange.createOrder(
      {
        askAssetProxyId: ERC20_PROXY_ID,
        askAssetAddress: this.erc20Ask.address,
        askAssetAmount: erc20AskValue.toString(),
        askAssetData: "0x00",
        bidAssetProxyId: ERC20_PROXY_ID,
        bidAssetAddress: this.erc20Bid.address,
        bidAssetAmount: new BN("20000").toString(),
        bidAssetData: "0x00",
        feeAmount: 0
      },
      { from: maker2 }
    );

    await this.exchange.createOrder(
      {
        askAssetProxyId: ERC20_PROXY_ID,
        askAssetAddress: this.erc20Ask.address,
        askAssetAmount: erc20AskValue.toString(),
        askAssetData: "0x00",
        bidAssetProxyId: ERC20_PROXY_ID,
        bidAssetAddress: this.erc20Bid.address,
        bidAssetAmount: new BN("30000").toString(),
        bidAssetData: "0x00",
        feeAmount: 0
      },
      { from: maker3 }
    );
  });

  it("no fills", async function() {
    let fills = await this.exchange.getOrderFills(this.erc20Proxy.address, this.erc20Bid.address, ZERO_ADDRESS, 0, 0);

    expect(fills.length).to.be.equal(0);
  });

  describe("orderFills", function() {
    before(async function() {
      this.timeStart = await time.latest();

      await this.exchange.fillOrder(
        {
          askAssetAddress: this.erc20Ask.address,
          bidAssetAddress: this.erc20Bid.address,
          nonce: 0,
          bidAssetAmountToFill: new BN("2500").toString(),
          feeAmount: 0
        },
        { from: taker1 }
      );

      await time.increase(time.duration.seconds(5));

      await this.exchange.fillOrder(
        {
          askAssetAddress: this.erc20Ask.address,
          bidAssetAddress: this.erc20Bid.address,
          nonce: 2,
          bidAssetAmountToFill: new BN("1200").toString(),
          feeAmount: 0
        },
        { from: taker2 }
      );

      await time.increase(time.duration.seconds(5));

      await this.exchange.fillOrder(
        {
          askAssetAddress: this.erc20Ask.address,
          bidAssetAddress: this.erc20Bid.address,
          nonce: 1,
          bidAssetAmountToFill: new BN("16000").toString(),
          feeAmount: 0
        },
        { from: taker3 }
      );

      await time.increase(time.duration.seconds(5));

      await this.exchange.fillOrder(
        {
          askAssetAddress: this.erc20Ask.address,
          bidAssetAddress: this.erc20Bid.address,
          nonce: 2,
          bidAssetAmountToFill: new BN("9000").toString(),
          feeAmount: 0
        },
        { from: taker1 }
      );

      await time.increase(time.duration.seconds(5));

      await this.exchange.fillOrder(
        {
          askAssetAddress: this.erc20Ask.address,
          bidAssetAddress: this.erc20Bid.address,
          nonce: 0,
          bidAssetAmountToFill: new BN("7500").toString(),
          feeAmount: 0
        },
        { from: taker2 }
      );

      await time.increase(time.duration.seconds(5));

      await this.exchange.fillOrder(
        {
          askAssetAddress: this.erc20Ask.address,
          bidAssetAddress: this.erc20Bid.address,
          nonce: 1,
          bidAssetAmountToFill: new BN("4000").toString(),
          feeAmount: 0
        },
        { from: taker3 }
      );

      await time.increase(time.duration.seconds(5));

      await this.exchange.fillOrder(
        {
          askAssetAddress: this.erc20Ask.address,
          bidAssetAddress: this.erc20Bid.address,
          nonce: 2,
          bidAssetAmountToFill: new BN("3000").toString(),
          feeAmount: 0
        },
        { from: taker1 }
      );

      await time.increase(time.duration.seconds(5));
      this.timeEnd = await time.latest();

      await this.exchange.fillOrder(
        {
          askAssetAddress: this.erc20Ask.address,
          bidAssetAddress: this.erc20Bid.address,
          nonce: 2,
          bidAssetAmountToFill: new BN("6000").toString(),
          feeAmount: 0
        },
        { from: taker2 }
      );

      await time.advanceBlock();
    });

    context("without taker", function() {
      it("should get all order fills", async function() {
        let fills = await this.exchange.getOrderFills(this.erc20Ask.address, this.erc20Bid.address, ZERO_ADDRESS, 0, 0);

        expect(fills.length).to.be.equal(8);
        expect(fills[0].bidAssetFilledAmount).to.be.equal("2500"); // taker1
        expect(fills[1].bidAssetFilledAmount).to.be.equal("1200"); // taker2
        expect(fills[2].bidAssetFilledAmount).to.be.equal("16000"); // taker3
        expect(fills[3].bidAssetFilledAmount).to.be.equal("9000"); // taker1
        expect(fills[4].bidAssetFilledAmount).to.be.equal("7500"); // taker2
        expect(fills[5].bidAssetFilledAmount).to.be.equal("4000"); // taker3
        expect(fills[6].bidAssetFilledAmount).to.be.equal("3000"); // taker1
        expect(fills[7].bidAssetFilledAmount).to.be.equal("6000"); // taker2
      });

      it("should get time range (timeFrom)", async function() {
        let fills = await this.exchange.getOrderFills(
          this.erc20Ask.address,
          this.erc20Bid.address,
          ZERO_ADDRESS,
          this.timeStart.add(time.duration.seconds(3)),
          0
        );

        expect(fills.length).to.be.equal(7);
        expect(fills[0].bidAssetFilledAmount).to.be.equal("1200");
        expect(fills[1].bidAssetFilledAmount).to.be.equal("16000");
        expect(fills[2].bidAssetFilledAmount).to.be.equal("9000");
        expect(fills[3].bidAssetFilledAmount).to.be.equal("7500");
        expect(fills[4].bidAssetFilledAmount).to.be.equal("4000");
        expect(fills[5].bidAssetFilledAmount).to.be.equal("3000");
        expect(fills[6].bidAssetFilledAmount).to.be.equal("6000");
      });

      it("should get time range (timeTo)", async function() {
        let fills = await this.exchange.getOrderFills(
          this.erc20Ask.address,
          this.erc20Bid.address,
          ZERO_ADDRESS,
          0,
          this.timeEnd.sub(time.duration.seconds(3))
        );

        expect(fills.length).to.be.equal(7);
        expect(fills[0].bidAssetFilledAmount).to.be.equal("2500");
        expect(fills[1].bidAssetFilledAmount).to.be.equal("1200");
        expect(fills[2].bidAssetFilledAmount).to.be.equal("16000");
        expect(fills[3].bidAssetFilledAmount).to.be.equal("9000");
        expect(fills[4].bidAssetFilledAmount).to.be.equal("7500");
        expect(fills[5].bidAssetFilledAmount).to.be.equal("4000");
        expect(fills[6].bidAssetFilledAmount).to.be.equal("3000");
      });

      it("should get time range (timeFrom, timeTo)", async function() {
        let fills = await this.exchange.getOrderFills(
          this.erc20Ask.address,
          this.erc20Bid.address,
          ZERO_ADDRESS,
          this.timeStart.add(time.duration.seconds(3)),
          this.timeEnd.sub(time.duration.seconds(3))
        );

        expect(fills.length).to.be.equal(6);
        expect(fills[0].bidAssetFilledAmount).to.be.equal("1200");
        expect(fills[1].bidAssetFilledAmount).to.be.equal("16000");
        expect(fills[2].bidAssetFilledAmount).to.be.equal("9000");
        expect(fills[3].bidAssetFilledAmount).to.be.equal("7500");
        expect(fills[4].bidAssetFilledAmount).to.be.equal("4000");
        expect(fills[5].bidAssetFilledAmount).to.be.equal("3000");
      });
    });

    context("with taker", function() {
      it("should get all order fills", async function() {
        let fills = await this.exchange.getOrderFills(this.erc20Ask.address, this.erc20Bid.address, taker1, 0, 0);

        expect(fills.length).to.be.equal(3);
        expect(fills[0].bidAssetFilledAmount).to.be.equal("2500");
        expect(fills[0].taker).to.be.equal(taker1);
        expect(fills[1].bidAssetFilledAmount).to.be.equal("9000");
        expect(fills[1].taker).to.be.equal(taker1);
        expect(fills[2].bidAssetFilledAmount).to.be.equal("3000");
        expect(fills[2].taker).to.be.equal(taker1);
      });

      it("should get time range (timeFrom)", async function() {
        let fills = await this.exchange.getOrderFills(
          this.erc20Ask.address,
          this.erc20Bid.address,
          taker1,
          this.timeStart.add(time.duration.seconds(3)),
          0
        );

        expect(fills.length).to.be.equal(2);
        expect(fills[0].bidAssetFilledAmount).to.be.equal("9000");
        expect(fills[0].taker).to.be.equal(taker1);
        expect(fills[1].bidAssetFilledAmount).to.be.equal("3000");
        expect(fills[1].taker).to.be.equal(taker1);
      });

      it("should get time range (timeTo)", async function() {
        let fills = await this.exchange.getOrderFills(
          this.erc20Ask.address,
          this.erc20Bid.address,
          taker2,
          0,
          this.timeEnd.sub(time.duration.seconds(3))
        );

        expect(fills.length).to.be.equal(2);
        expect(fills[0].bidAssetFilledAmount).to.be.equal("1200");
        expect(fills[0].taker).to.be.equal(taker2);
        expect(fills[1].bidAssetFilledAmount).to.be.equal("7500");
        expect(fills[1].taker).to.be.equal(taker2);
      });

      it("should get time range (timeFrom, timeTo)", async function() {
        let fills = await this.exchange.getOrderFills(
          this.erc20Ask.address,
          this.erc20Bid.address,
          taker3,
          this.timeStart.add(time.duration.seconds(3)),
          this.timeEnd.sub(time.duration.seconds(3))
        );

        expect(fills.length).to.be.equal(2);
        expect(fills[0].bidAssetFilledAmount).to.be.equal("16000");
        expect(fills[0].taker).to.be.equal(taker3);
        expect(fills[1].bidAssetFilledAmount).to.be.equal("4000");
        expect(fills[1].taker).to.be.equal(taker3);
      });
    });
  });
});
