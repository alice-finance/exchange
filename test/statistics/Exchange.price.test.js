const Exchange = artifacts.require("./exchange/Exchange.sol");
const Statistics = artifacts.require("./statistics/Statistics.sol");
const ERC20Proxy = artifacts.require("./proxy/ERC20Proxy.sol");
const ERC721Proxy = artifacts.require("./proxy/ERC721Proxy.sol");
const ERC20 = artifacts.require("./mock/ERC20Mock.sol");
const ERC721 = artifacts.require("./mock/ERC721Mock.sol");

const { BN, constants, expectEvent } = require("openzeppelin-test-helpers");
const { expect } = require("chai");
const { ZERO_ADDRESS } = constants;

const SIG_ORDER_CREATED = "0xbd47c557d46a8fa286d10778547accc8ee2803cbaa0b366b093271369cd57275"; //keccak256("OrderCreated(uint256,address,bytes4,address,uint256,bytes,bytes4,address,uint256,bytes,uint256)");
const SIG_ORDER_FILLED = "0x8bab5121105c1470f66ada0801bfafc6928c682fadc7792d126cde7b9826059c"; //keccak256("OrderFilled(nonce,address,address,address,uint256,uint8,uint256)");
const SIG_ORDER_CANCELLED = "0xa4bb54ffb7bcc3eb7bdd81e41ad340b367a9b3a7416cd7764e68713a274c9da3"; //keccak256("OrderCancelled(uint256,address,address,uint256)");

contract("Exchange.price", function([admin, owner, user1, user2, user3, user4, user5, user6]) {
  const LIMIT = new BN("2", 10).pow(new BN("128", 10)).sub(new BN("1"));
  const ERC20_PROXY_ID = "0xcc4aa204";
  const ERC721_PROXY_ID = "0x9013e617";
  const erc20AskValue = new BN("10000");
  const erc20BidValue = new BN("20000");

  async function initializeExchange(exchange, owner) {
    const signature = "initialize(address)";
    const args = [owner];
    await exchange.methods[signature](...args, { from: admin });
  }

  describe("price changes", function() {
    beforeEach(async function() {
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

      await this.erc20Ask.mint(user1, LIMIT, { from: admin });
      await this.erc20Ask.mint(user2, LIMIT, { from: admin });
      await this.erc20Ask.mint(user3, LIMIT, { from: admin });
      await this.erc20Bid.mint(user1, LIMIT, { from: admin });
      await this.erc20Bid.mint(user2, LIMIT, { from: admin });
      await this.erc20Bid.mint(user3, LIMIT, { from: admin });

      await this.erc20Ask.approve(this.erc20Proxy.address, LIMIT, { from: user1 });
      await this.erc20Ask.approve(this.erc20Proxy.address, LIMIT, { from: user2 });
      await this.erc20Ask.approve(this.erc20Proxy.address, LIMIT, { from: user3 });
      await this.erc20Bid.approve(this.erc20Proxy.address, LIMIT, { from: user1 });
      await this.erc20Bid.approve(this.erc20Proxy.address, LIMIT, { from: user2 });
      await this.erc20Bid.approve(this.erc20Proxy.address, LIMIT, { from: user3 });
    });

    it("should report price change when order has lower price created", async function() {
      let { tx: tx1 } = await this.exchange.createOrder(
        {
          askAssetProxyId: ERC20_PROXY_ID,
          askAssetAddress: this.erc20Ask.address,
          askAssetAmount: erc20AskValue.toString(),
          askAssetData: "0x00",
          bidAssetProxyId: ERC20_PROXY_ID,
          bidAssetAddress: this.erc20Bid.address,
          bidAssetAmount: erc20BidValue.toString(),
          bidAssetData: "0x00",
          feeAmount: 0
        },
        { from: user1 }
      );

      let event1 = await expectEvent.inTransaction(tx1, Statistics, "PriceChanged");
      expect(event1.args.askAssetAmount).to.be.bignumber.equal(erc20AskValue);
      expect(event1.args.bidAssetAmount).to.be.bignumber.equal(erc20BidValue);

      let { tx: tx2 } = await this.exchange.createOrder(
        {
          askAssetProxyId: ERC20_PROXY_ID,
          askAssetAddress: this.erc20Ask.address,
          askAssetAmount: erc20AskValue.toString(),
          askAssetData: "0x00",
          bidAssetProxyId: ERC20_PROXY_ID,
          bidAssetAddress: this.erc20Bid.address,
          bidAssetAmount: erc20BidValue.mul(new BN("2")).toString(),
          bidAssetData: "0x00",
          feeAmount: 0
        },
        { from: user2 }
      );

      let event2 = await expectEvent.inTransaction(tx2, Statistics, "PriceChanged");
      expect(event2.args.askAssetAmount).to.be.bignumber.equal(erc20AskValue);
      expect(event2.args.bidAssetAmount).to.be.bignumber.equal(erc20BidValue.mul(new BN("2")));
    });

    it("should not report price change when order has higher price created", async function() {
      let { tx: tx1 } = await this.exchange.createOrder(
        {
          askAssetProxyId: ERC20_PROXY_ID,
          askAssetAddress: this.erc20Ask.address,
          askAssetAmount: erc20AskValue.toString(),
          askAssetData: "0x00",
          bidAssetProxyId: ERC20_PROXY_ID,
          bidAssetAddress: this.erc20Bid.address,
          bidAssetAmount: erc20BidValue.mul(new BN("2")).toString(),
          bidAssetData: "0x00",
          feeAmount: 0
        },
        { from: user1 }
      );

      let event1 = await expectEvent.inTransaction(tx1, Statistics, "PriceChanged");
      expect(event1.args.askAssetAmount).to.be.bignumber.equal(erc20AskValue);
      expect(event1.args.bidAssetAmount).to.be.bignumber.equal(erc20BidValue.mul(new BN("2")));

      let { tx: tx2 } = await this.exchange.createOrder(
        {
          askAssetProxyId: ERC20_PROXY_ID,
          askAssetAddress: this.erc20Ask.address,
          askAssetAmount: erc20AskValue.toString(),
          askAssetData: "0x00",
          bidAssetProxyId: ERC20_PROXY_ID,
          bidAssetAddress: this.erc20Bid.address,
          bidAssetAmount: erc20BidValue.toString(),
          bidAssetData: "0x00",
          feeAmount: 0
        },
        { from: user2 }
      );

      try {
        await expectEvent.inTransaction(tx2, Statistics, "PriceChanged");
        throw Error("should not reach this code");
      } catch {}
    });

    it("should report price change when lowest price order filled", async function() {
      await this.exchange.createOrder(
        {
          askAssetProxyId: ERC20_PROXY_ID,
          askAssetAddress: this.erc20Ask.address,
          askAssetAmount: erc20AskValue.toString(),
          askAssetData: "0x00",
          bidAssetProxyId: ERC20_PROXY_ID,
          bidAssetAddress: this.erc20Bid.address,
          bidAssetAmount: erc20BidValue.mul(new BN("2")).toString(),
          bidAssetData: "0x00",
          feeAmount: 0
        },
        { from: user1 }
      );

      await this.exchange.createOrder(
        {
          askAssetProxyId: ERC20_PROXY_ID,
          askAssetAddress: this.erc20Ask.address,
          askAssetAmount: erc20AskValue.toString(),
          askAssetData: "0x00",
          bidAssetProxyId: ERC20_PROXY_ID,
          bidAssetAddress: this.erc20Bid.address,
          bidAssetAmount: erc20BidValue.toString(),
          bidAssetData: "0x00",
          feeAmount: 0
        },
        { from: user2 }
      );

      const { tx } = await this.exchange.fillOrder(
        {
          askAssetAddress: this.erc20Ask.address,
          bidAssetAddress: this.erc20Bid.address,
          nonce: 0,
          bidAssetAmountToFill: erc20BidValue.mul(new BN("2")).toString(),
          feeAmount: 0
        },
        { from: user2 }
      );

      try {
        await expectEvent.inTransaction(tx, Statistics, "PriceChanged", {
          askAssetAmount: erc20AskValue,
          bidAssetAmount: erc20BidValue
        });
        throw Error("should not reach this code");
      } catch {}
    });

    it("should not report price change when lowest price order partially filled", async function() {
      await this.exchange.createOrder(
        {
          askAssetProxyId: ERC20_PROXY_ID,
          askAssetAddress: this.erc20Ask.address,
          askAssetAmount: erc20AskValue.toString(),
          askAssetData: "0x00",
          bidAssetProxyId: ERC20_PROXY_ID,
          bidAssetAddress: this.erc20Bid.address,
          bidAssetAmount: erc20BidValue.mul(new BN("2")).toString(),
          bidAssetData: "0x00",
          feeAmount: 0
        },
        { from: user1 }
      );

      await this.exchange.createOrder(
        {
          askAssetProxyId: ERC20_PROXY_ID,
          askAssetAddress: this.erc20Ask.address,
          askAssetAmount: erc20AskValue.toString(),
          askAssetData: "0x00",
          bidAssetProxyId: ERC20_PROXY_ID,
          bidAssetAddress: this.erc20Bid.address,
          bidAssetAmount: erc20BidValue.toString(),
          bidAssetData: "0x00",
          feeAmount: 0
        },
        { from: user2 }
      );

      const { tx } = await this.exchange.fillOrder(
        {
          askAssetAddress: this.erc20Ask.address,
          bidAssetAddress: this.erc20Bid.address,
          nonce: 0,
          bidAssetAmountToFill: erc20BidValue.div(new BN("2")).toString(),
          feeAmount: 0
        },
        { from: user2 }
      );

      try {
        await expectEvent.inTransaction(tx, Statistics, "PriceChanged");
        throw Error("should not reach this code");
      } catch {}
    });

    it("should not report price change when fully filled order is not lowest price order", async function() {
      await this.exchange.createOrder(
        {
          askAssetProxyId: ERC20_PROXY_ID,
          askAssetAddress: this.erc20Ask.address,
          askAssetAmount: erc20AskValue.toString(),
          askAssetData: "0x00",
          bidAssetProxyId: ERC20_PROXY_ID,
          bidAssetAddress: this.erc20Bid.address,
          bidAssetAmount: erc20BidValue.mul(new BN("2")).toString(),
          bidAssetData: "0x00",
          feeAmount: 0
        },
        { from: user1 }
      );

      await this.exchange.createOrder(
        {
          askAssetProxyId: ERC20_PROXY_ID,
          askAssetAddress: this.erc20Ask.address,
          askAssetAmount: erc20AskValue.toString(),
          askAssetData: "0x00",
          bidAssetProxyId: ERC20_PROXY_ID,
          bidAssetAddress: this.erc20Bid.address,
          bidAssetAmount: erc20BidValue.toString(),
          bidAssetData: "0x00",
          feeAmount: 0
        },
        { from: user2 }
      );

      const { tx } = await this.exchange.fillOrder(
        {
          askAssetAddress: this.erc20Ask.address,
          bidAssetAddress: this.erc20Bid.address,
          nonce: 1,
          bidAssetAmountToFill: erc20BidValue.toString(),
          feeAmount: 0
        },
        { from: user1 }
      );

      try {
        await expectEvent.inTransaction(tx, Statistics, "PriceChanged");
        throw Error("should not reach this code");
      } catch {}
    });

    it("should report price change when lowest price order cancelled", async function() {
      await this.exchange.createOrder(
        {
          askAssetProxyId: ERC20_PROXY_ID,
          askAssetAddress: this.erc20Ask.address,
          askAssetAmount: erc20AskValue.toString(),
          askAssetData: "0x00",
          bidAssetProxyId: ERC20_PROXY_ID,
          bidAssetAddress: this.erc20Bid.address,
          bidAssetAmount: erc20BidValue.mul(new BN("2")).toString(),
          bidAssetData: "0x00",
          feeAmount: 0
        },
        { from: user1 }
      );

      await this.exchange.createOrder(
        {
          askAssetProxyId: ERC20_PROXY_ID,
          askAssetAddress: this.erc20Ask.address,
          askAssetAmount: erc20AskValue.toString(),
          askAssetData: "0x00",
          bidAssetProxyId: ERC20_PROXY_ID,
          bidAssetAddress: this.erc20Bid.address,
          bidAssetAmount: erc20BidValue.toString(),
          bidAssetData: "0x00",
          feeAmount: 0
        },
        { from: user2 }
      );

      const { tx } = await this.exchange.cancelOrder(
        {
          askAssetAddress: this.erc20Ask.address,
          bidAssetAddress: this.erc20Bid.address,
          nonce: 0
        },
        { from: user1 }
      );

      try {
        await expectEvent.inTransaction(tx, Statistics, "PriceChanged", {
          askAssetAmount: erc20AskValue,
          bidAssetAmount: erc20BidValue
        });
        throw Error("should not reach this code");
      } catch {}
    });

    it("should not report price change when cancelled order is not lowest price", async function() {
      await this.exchange.createOrder(
        {
          askAssetProxyId: ERC20_PROXY_ID,
          askAssetAddress: this.erc20Ask.address,
          askAssetAmount: erc20AskValue.toString(),
          askAssetData: "0x00",
          bidAssetProxyId: ERC20_PROXY_ID,
          bidAssetAddress: this.erc20Bid.address,
          bidAssetAmount: erc20BidValue.mul(new BN("2")).toString(),
          bidAssetData: "0x00",
          feeAmount: 0
        },
        { from: user1 }
      );

      await this.exchange.createOrder(
        {
          askAssetProxyId: ERC20_PROXY_ID,
          askAssetAddress: this.erc20Ask.address,
          askAssetAmount: erc20AskValue.toString(),
          askAssetData: "0x00",
          bidAssetProxyId: ERC20_PROXY_ID,
          bidAssetAddress: this.erc20Bid.address,
          bidAssetAmount: erc20BidValue.toString(),
          bidAssetData: "0x00",
          feeAmount: 0
        },
        { from: user2 }
      );

      const { tx } = await this.exchange.cancelOrder(
        {
          askAssetAddress: this.erc20Ask.address,
          bidAssetAddress: this.erc20Bid.address,
          nonce: 1
        },
        { from: user2 }
      );

      try {
        await expectEvent.inTransaction(tx, Statistics, "PriceChanged");
        throw Error("should not reach this code");
      } catch {}
    });
  });

  describe("price scenario", function() {
    const ask1Value = new BN("1000"); // 0.5
    const bid1Value = new BN("2000");
    const ask2Value = new BN("1500"); // 0.75 a
    const bid2Value = new BN("2000");
    const ask3Value = new BN("1000"); // 0.33 a
    const bid3Value = new BN("3000");
    const ask4Value = new BN("3000"); // 0.6
    const bid4Value = new BN("5000");
    const ask5Value = new BN("1000"); // 0.33 a
    const bid5Value = new BN("3000");
    const ask6Value = new BN("1000"); // 0.2 a
    const bid6Value = new BN("5000");

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

      await this.erc20Ask.mint(user1, LIMIT, { from: admin });
      await this.erc20Ask.mint(user2, LIMIT, { from: admin });
      await this.erc20Ask.mint(user3, LIMIT, { from: admin });
      await this.erc20Ask.mint(user4, LIMIT, { from: admin });
      await this.erc20Ask.mint(user5, LIMIT, { from: admin });
      await this.erc20Ask.mint(user6, LIMIT, { from: admin });
      await this.erc20Bid.mint(user1, LIMIT, { from: admin });
      await this.erc20Bid.mint(user2, LIMIT, { from: admin });
      await this.erc20Bid.mint(user3, LIMIT, { from: admin });
      await this.erc20Bid.mint(user4, LIMIT, { from: admin });
      await this.erc20Bid.mint(user5, LIMIT, { from: admin });
      await this.erc20Bid.mint(user6, LIMIT, { from: admin });

      await this.erc20Ask.approve(this.erc20Proxy.address, LIMIT, { from: user1 });
      await this.erc20Ask.approve(this.erc20Proxy.address, LIMIT, { from: user2 });
      await this.erc20Ask.approve(this.erc20Proxy.address, LIMIT, { from: user3 });
      await this.erc20Ask.approve(this.erc20Proxy.address, LIMIT, { from: user4 });
      await this.erc20Ask.approve(this.erc20Proxy.address, LIMIT, { from: user5 });
      await this.erc20Ask.approve(this.erc20Proxy.address, LIMIT, { from: user6 });
      await this.erc20Bid.approve(this.erc20Proxy.address, LIMIT, { from: user1 });
      await this.erc20Bid.approve(this.erc20Proxy.address, LIMIT, { from: user2 });
      await this.erc20Bid.approve(this.erc20Proxy.address, LIMIT, { from: user3 });
      await this.erc20Bid.approve(this.erc20Proxy.address, LIMIT, { from: user4 });
      await this.erc20Bid.approve(this.erc20Proxy.address, LIMIT, { from: user5 });
      await this.erc20Bid.approve(this.erc20Proxy.address, LIMIT, { from: user6 });
    });

    it(`should report when #0(${ask1Value}/${bid1Value}) created`, async function() {
      let { tx } = await this.exchange.createOrder(
        {
          askAssetProxyId: ERC20_PROXY_ID,
          askAssetAddress: this.erc20Ask.address,
          askAssetAmount: ask1Value.toString(),
          askAssetData: "0x00",
          bidAssetProxyId: ERC20_PROXY_ID,
          bidAssetAddress: this.erc20Bid.address,
          bidAssetAmount: bid1Value.toString(),
          bidAssetData: "0x00",
          feeAmount: 0
        },
        { from: user1 }
      );

      await expectEvent.inTransaction(tx, Statistics, "PriceChanged", {
        askAssetAmount: ask1Value,
        bidAssetAmount: bid1Value
      });
    });

    it(`should not report when #1(${ask2Value}/${bid2Value}) created`, async function() {
      let { tx } = await this.exchange.createOrder(
        {
          askAssetProxyId: ERC20_PROXY_ID,
          askAssetAddress: this.erc20Ask.address,
          askAssetAmount: ask2Value.toString(),
          askAssetData: "0x00",
          bidAssetProxyId: ERC20_PROXY_ID,
          bidAssetAddress: this.erc20Bid.address,
          bidAssetAmount: bid2Value.toString(),
          bidAssetData: "0x00",
          feeAmount: 0
        },
        { from: user2 }
      );

      try {
        await expectEvent.inTransaction(tx, Statistics, "PriceChanged");
        throw Error("should not reach this code");
      } catch {}
    });

    it(`should report when #2(${ask3Value}/${bid3Value}) created`, async function() {
      let { tx } = await this.exchange.createOrder(
        {
          askAssetProxyId: ERC20_PROXY_ID,
          askAssetAddress: this.erc20Ask.address,
          askAssetAmount: ask3Value.toString(),
          askAssetData: "0x00",
          bidAssetProxyId: ERC20_PROXY_ID,
          bidAssetAddress: this.erc20Bid.address,
          bidAssetAmount: bid3Value.toString(),
          bidAssetData: "0x00",
          feeAmount: 0
        },
        { from: user3 }
      );

      await expectEvent.inTransaction(tx, Statistics, "PriceChanged", {
        askAssetAmount: ask3Value,
        bidAssetAmount: bid3Value
      });
    });

    it(`should not report when #3(${ask4Value}/${bid4Value}) created`, async function() {
      let { tx } = await this.exchange.createOrder(
        {
          askAssetProxyId: ERC20_PROXY_ID,
          askAssetAddress: this.erc20Ask.address,
          askAssetAmount: ask4Value.toString(),
          askAssetData: "0x00",
          bidAssetProxyId: ERC20_PROXY_ID,
          bidAssetAddress: this.erc20Bid.address,
          bidAssetAmount: bid4Value.toString(),
          bidAssetData: "0x00",
          feeAmount: 0
        },
        { from: user4 }
      );

      try {
        await expectEvent.inTransaction(tx, Statistics, "PriceChanged");
        throw Error("should not reach this code");
      } catch {}
    });

    it(`should not report when #4(${ask5Value}/${bid5Value}) created`, async function() {
      let { tx } = await this.exchange.createOrder(
        {
          askAssetProxyId: ERC20_PROXY_ID,
          askAssetAddress: this.erc20Ask.address,
          askAssetAmount: ask5Value.toString(),
          askAssetData: "0x00",
          bidAssetProxyId: ERC20_PROXY_ID,
          bidAssetAddress: this.erc20Bid.address,
          bidAssetAmount: bid5Value.toString(),
          bidAssetData: "0x00",
          feeAmount: 0
        },
        { from: user5 }
      );

      try {
        await expectEvent.inTransaction(tx, Statistics, "PriceChanged");
        throw Error("should not reach this code");
      } catch {}
    });

    it(`should not report when #2(${ask3Value}/${bid3Value}) filled`, async function() {
      let { tx } = await this.exchange.fillOrder(
        {
          askAssetAddress: this.erc20Ask.address,
          bidAssetAddress: this.erc20Bid.address,
          nonce: 2,
          bidAssetAmountToFill: bid3Value.toString(),
          feeAmount: 0
        },
        { from: user1 }
      );

      try {
        await expectEvent.inTransaction(tx, Statistics, "PriceChanged");
        throw Error("should not reach this code");
      } catch {}
    });

    it(`should report when #4(${ask5Value}/${bid5Value}) filled`, async function() {
      let { tx } = await this.exchange.fillOrder(
        {
          askAssetAddress: this.erc20Ask.address,
          bidAssetAddress: this.erc20Bid.address,
          nonce: 4,
          bidAssetAmountToFill: bid5Value.toString(),
          feeAmount: 0
        },
        { from: user2 }
      );

      await expectEvent.inTransaction(tx, Statistics, "PriceChanged", {
        askAssetAmount: ask1Value,
        bidAssetAmount: bid1Value
      });
    });

    it(`should not report when #1(${ask2Value}/${bid2Value}) filled`, async function() {
      let { tx } = await this.exchange.fillOrder(
        {
          askAssetAddress: this.erc20Ask.address,
          bidAssetAddress: this.erc20Bid.address,
          nonce: 1,
          bidAssetAmountToFill: bid2Value.toString(),
          feeAmount: 0
        },
        { from: user3 }
      );

      try {
        await expectEvent.inTransaction(tx, Statistics, "PriceChanged");
        throw Error("should not reach this code");
      } catch {}
    });

    it(`should report when #5(${ask6Value}/${bid6Value}) created`, async function() {
      let { tx } = await this.exchange.createOrder(
        {
          askAssetProxyId: ERC20_PROXY_ID,
          askAssetAddress: this.erc20Ask.address,
          askAssetAmount: ask6Value.toString(),
          askAssetData: "0x00",
          bidAssetProxyId: ERC20_PROXY_ID,
          bidAssetAddress: this.erc20Bid.address,
          bidAssetAmount: bid6Value.toString(),
          bidAssetData: "0x00",
          feeAmount: 0
        },
        { from: user6 }
      );

      await expectEvent.inTransaction(tx, Statistics, "PriceChanged", {
        askAssetAmount: ask6Value,
        bidAssetAmount: bid6Value
      });
    });

    it(`should report when #5(${ask6Value}/${bid6Value}) filled`, async function() {
      let { tx } = await this.exchange.fillOrder(
        {
          askAssetAddress: this.erc20Ask.address,
          bidAssetAddress: this.erc20Bid.address,
          nonce: 5,
          bidAssetAmountToFill: bid6Value.toString(),
          feeAmount: 0
        },
        { from: user2 }
      );

      await expectEvent.inTransaction(tx, Statistics, "PriceChanged", {
        askAssetAmount: ask1Value,
        bidAssetAmount: bid1Value
      });
    });

    it(`should report when #0(${ask1Value}/${bid1Value}) filled`, async function() {
      let { tx } = await this.exchange.fillOrder(
        {
          askAssetAddress: this.erc20Ask.address,
          bidAssetAddress: this.erc20Bid.address,
          nonce: 0,
          bidAssetAmountToFill: bid1Value.toString(),
          feeAmount: 0
        },
        { from: user5 }
      );

      await expectEvent.inTransaction(tx, Statistics, "PriceChanged", {
        askAssetAmount: ask4Value,
        bidAssetAmount: bid4Value
      });
    });

    it(`should not report when #3(${ask4Value}/${bid4Value}) filled`, async function() {
      // last order filled
      let { tx } = await this.exchange.fillOrder(
        {
          askAssetAddress: this.erc20Ask.address,
          bidAssetAddress: this.erc20Bid.address,
          nonce: 3,
          bidAssetAmountToFill: bid4Value.toString(),
          feeAmount: 0
        },
        { from: user6 }
      );

      // maintain last price
      try {
        await expectEvent.inTransaction(tx, Statistics, "PriceChanged");
        throw Error("should not reach this code");
      } catch {}
    });

    it("check order count", async function() {
      let list = await this.exchange.getOrders(this.erc20Ask.address, this.erc20Bid.address, 0, ZERO_ADDRESS, 0, 0);
      expect(list.length).to.be.equal(6);
    });

    it.skip("check massive orders", async function() {
      function shuffle(a) {
        for (let i = a.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
      }

      const REPEAT = 100;
      for (i = 0; i < REPEAT; i++) {
        await this.exchange.createOrder(
          {
            askAssetProxyId: ERC20_PROXY_ID,
            askAssetAddress: this.erc20Ask.address,
            askAssetAmount: REPEAT - i,
            askAssetData: "0x00",
            bidAssetProxyId: ERC20_PROXY_ID,
            bidAssetAddress: this.erc20Bid.address,
            bidAssetAmount: i + 1,
            bidAssetData: "0x00",
            feeAmount: 0
          },
          { from: user1 }
        );
        console.log(`#${i}(${REPEAT - i},${i + 1}) created`);
      }

      let nonces = shuffle([...Array(REPEAT).keys()]);

      let exchange = this.exchange;
      let askAddress = this.erc20Ask.address;
      let bidAddress = this.erc20Bid.address;

      async function fillOrder(nonce) {
        await exchange.fillOrder(
          {
            askAssetAddress: askAddress,
            bidAssetAddress: bidAddress,
            bidAssetAmountToFill: nonce + 1,
            nonce: nonce,
            feeAmount: 0
          },
          { from: user2 }
        );
        console.log(`#${nonce}(${REPEAT - nonce},${nonce + 1}) filled`);
      }

      await Promise.all(nonces.map(fillOrder));
    });
  });
});
