const Exchange = artifacts.require("./exchange/Exchange.sol");
const ERC20Proxy = artifacts.require("./proxy/ERC20Proxy.sol");
const ERC721Proxy = artifacts.require("./proxy/ERC721Proxy.sol");
const ERC20 = artifacts.require("./mock/ERC20Mock.sol");
const ERC721 = artifacts.require("./mock/ERC721Mock.sol");

const { BN, time, constants } = require("openzeppelin-test-helpers");
const { ZERO_ADDRESS } = constants;

contract("Exchange.getOrders", function ([admin, owner, maker1, maker2, maker3, taker1]) {
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

  before(async function () {
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
    await this.erc20Ask.approve(this.erc20Proxy.address, LIMIT, { from: maker1 });
    await this.erc20Ask.approve(this.erc20Proxy.address, LIMIT, { from: maker2 });
    await this.erc20Ask.approve(this.erc20Proxy.address, LIMIT, { from: maker3 });
    await this.erc20Bid.approve(this.erc20Proxy.address, LIMIT, { from: taker1 });

    this.timeStart = await time.latest();

    await this.exchange.createOrder({
      askAssetProxyId: ERC20_PROXY_ID,
      askAssetAddress: this.erc20Ask.address,
      askAssetAmount: erc20AskValue.toString(),
      askAssetData: "0x00",
      bidAssetProxyId: ERC20_PROXY_ID,
      bidAssetAddress: this.erc20Bid.address,
      bidAssetAmount: new BN("10000").toString(),
      bidAssetData: "0x00",
      feeAmount: 0
    }, { from: maker1 });

    await time.increase(time.duration.seconds(5));

    await this.exchange.createOrder({
      askAssetProxyId: ERC20_PROXY_ID,
      askAssetAddress: this.erc20Ask.address,
      askAssetAmount: erc20AskValue.toString(),
      askAssetData: "0x00",
      bidAssetProxyId: ERC20_PROXY_ID,
      bidAssetAddress: this.erc20Bid.address,
      bidAssetAmount: new BN("20000").toString(),
      bidAssetData: "0x00",
      feeAmount: 0
    }, { from: maker3 });

    await time.increase(time.duration.seconds(5));

    await this.exchange.createOrder({
      askAssetProxyId: ERC20_PROXY_ID,
      askAssetAddress: this.erc20Ask.address,
      askAssetAmount: erc20AskValue.toString(),
      askAssetData: "0x00",
      bidAssetProxyId: ERC20_PROXY_ID,
      bidAssetAddress: this.erc20Bid.address,
      bidAssetAmount: new BN("30000").toString(),
      bidAssetData: "0x00",
      feeAmount: 0
    }, { from: maker2 });

    await time.increase(time.duration.seconds(5));

    await this.exchange.createOrder({
      askAssetProxyId: ERC20_PROXY_ID,
      askAssetAddress: this.erc20Ask.address,
      askAssetAmount: erc20AskValue.toString(),
      askAssetData: "0x00",
      bidAssetProxyId: ERC20_PROXY_ID,
      bidAssetAddress: this.erc20Bid.address,
      bidAssetAmount: new BN("40000").toString(),
      bidAssetData: "0x00",
      feeAmount: 0
    }, { from: maker3 });

    await time.increase(time.duration.seconds(5));

    await this.exchange.createOrder({
      askAssetProxyId: ERC20_PROXY_ID,
      askAssetAddress: this.erc20Ask.address,
      askAssetAmount: erc20AskValue.toString(),
      askAssetData: "0x00",
      bidAssetProxyId: ERC20_PROXY_ID,
      bidAssetAddress: this.erc20Bid.address,
      bidAssetAmount: new BN("50000").toString(),
      bidAssetData: "0x00",
      feeAmount: 0
    }, { from: maker1 });

    await time.increase(time.duration.seconds(5));
    this.timeEnd = await time.latest();

    await this.exchange.createOrder({
      askAssetProxyId: ERC20_PROXY_ID,
      askAssetAddress: this.erc20Ask.address,
      askAssetAmount: erc20AskValue.toString(),
      askAssetData: "0x00",
      bidAssetProxyId: ERC20_PROXY_ID,
      bidAssetAddress: this.erc20Bid.address,
      bidAssetAmount: new BN("60000").toString(),
      bidAssetData: "0x00",
      feeAmount: 0
    }, { from: maker2 });

    await time.advanceBlock();
  });

  it("no orders", async function () {
    let orders = await this.exchange.getOrders(
      this.erc20Proxy.address,
      this.erc20Bid.address,
      3,
      ZERO_ADDRESS,
      0,
      0
    );

    orders.length.should.be.equal(0);
  });

  describe("getOrders", function () {
    before(async function () {
      await this.exchange.cancelOrder({
        askAssetAddress: this.erc20Ask.address,
        bidAssetAddress: this.erc20Bid.address,
        nonce: 2
      }, { from: maker2 });

      await this.exchange.cancelOrder({
        askAssetAddress: this.erc20Ask.address,
        bidAssetAddress: this.erc20Bid.address,
        nonce: 4
      }, { from: maker1 });

      await this.exchange.fillOrders({
        askAssetAddress: this.erc20Ask.address,
        bidAssetAddress: this.erc20Bid.address,
        nonces: [1, 5],
        bidAssetAmountToFill: new BN("210000").toString(),
        feeAmount: 0
      }, { from: taker1 });
    });

    // from: 10000, maker1
    // from: 20000, maker3 - filled
    // from: 30000, maker2 - cancelled
    // from: 40000, maker3
    // from: 50000, maker1 - cancelled
    // from: 60000, maker2 - filled

    describe("all status", function () {
      context("without maker", function () {
        it("should get all orders", async function () {
          let orders = await this.exchange.getOrders(
            this.erc20Ask.address,
            this.erc20Bid.address,
            0,
            ZERO_ADDRESS,
            0,
            0
          );

          orders.length.should.be.equal(6);
          orders[0].bidAssetAmount.should.be.equal("10000");
          orders[0].maker.should.be.equal(maker1);
          orders[1].bidAssetAmount.should.be.equal("20000");
          orders[1].maker.should.be.equal(maker3);
          orders[2].bidAssetAmount.should.be.equal("30000");
          orders[2].maker.should.be.equal(maker2);
          orders[3].bidAssetAmount.should.be.equal("40000");
          orders[3].maker.should.be.equal(maker3);
          orders[4].bidAssetAmount.should.be.equal("50000");
          orders[4].maker.should.be.equal(maker1);
          orders[5].bidAssetAmount.should.be.equal("60000");
          orders[5].maker.should.be.equal(maker2);
        });

        it("should get time range (timeFrom)", async function () {
          let orders = await this.exchange.getOrders(
            this.erc20Ask.address,
            this.erc20Bid.address,
            0,
            ZERO_ADDRESS,
            this.timeStart.add(time.duration.seconds(3)),
            0
          );

          orders.length.should.be.equal(5);
          orders[0].bidAssetAmount.should.be.equal("20000");
          orders[0].maker.should.be.equal(maker3);
          orders[1].bidAssetAmount.should.be.equal("30000");
          orders[1].maker.should.be.equal(maker2);
          orders[2].bidAssetAmount.should.be.equal("40000");
          orders[2].maker.should.be.equal(maker3);
          orders[3].bidAssetAmount.should.be.equal("50000");
          orders[3].maker.should.be.equal(maker1);
          orders[4].bidAssetAmount.should.be.equal("60000");
          orders[4].maker.should.be.equal(maker2);
        });

        it("should get time range (timeTo)", async function () {
          let orders = await this.exchange.getOrders(
            this.erc20Ask.address,
            this.erc20Bid.address,
            0,
            ZERO_ADDRESS,
            0,
            this.timeEnd.sub(time.duration.seconds(3))
          );

          orders.length.should.be.equal(5);
          orders[0].bidAssetAmount.should.be.equal("10000");
          orders[0].maker.should.be.equal(maker1);
          orders[1].bidAssetAmount.should.be.equal("20000");
          orders[1].maker.should.be.equal(maker3);
          orders[2].bidAssetAmount.should.be.equal("30000");
          orders[2].maker.should.be.equal(maker2);
          orders[3].bidAssetAmount.should.be.equal("40000");
          orders[3].maker.should.be.equal(maker3);
          orders[4].bidAssetAmount.should.be.equal("50000");
          orders[4].maker.should.be.equal(maker1);
        });

        it("should get time range (timeFrom, timeTo)", async function () {
          let orders = await this.exchange.getOrders(
            this.erc20Ask.address,
            this.erc20Bid.address,
            0,
            ZERO_ADDRESS,
            this.timeStart.add(time.duration.seconds(3)),
            this.timeEnd.sub(time.duration.seconds(3))
          );

          orders.length.should.be.equal(4);
          orders[0].bidAssetAmount.should.be.equal("20000");
          orders[0].maker.should.be.equal(maker3);
          orders[1].bidAssetAmount.should.be.equal("30000");
          orders[1].maker.should.be.equal(maker2);
          orders[2].bidAssetAmount.should.be.equal("40000");
          orders[2].maker.should.be.equal(maker3);
          orders[3].bidAssetAmount.should.be.equal("50000");
          orders[3].maker.should.be.equal(maker1);
        });
      });

      context("with maker", function () {
        it("should get all orders", async function () {
          let orders = await this.exchange.getOrders(
            this.erc20Ask.address,
            this.erc20Bid.address,
            0,
            maker1,
            0,
            0
          );

          orders.length.should.be.equal(2);
          orders[0].bidAssetAmount.should.be.equal("10000");
          orders[0].maker.should.be.equal(maker1);
          orders[1].bidAssetAmount.should.be.equal("50000");
          orders[1].maker.should.be.equal(maker1);
        });

        it("should get time range (timeFrom)", async function () {
          let orders = await this.exchange.getOrders(
            this.erc20Ask.address,
            this.erc20Bid.address,
            0,
            maker1,
            this.timeStart.add(time.duration.seconds(3)),
            0
          );

          orders.length.should.be.equal(1);
          orders[0].bidAssetAmount.should.be.equal("50000");
          orders[0].maker.should.be.equal(maker1);
        });

        it("should get time range (timeTo)", async function () {
          let orders = await this.exchange.getOrders(
            this.erc20Ask.address,
            this.erc20Bid.address,
            0,
            maker1,
            0,
            this.timeEnd.sub(time.duration.seconds(3))
          );

          orders.length.should.be.equal(2);
          orders[0].bidAssetAmount.should.be.equal("10000");
          orders[0].maker.should.be.equal(maker1);
          orders[1].bidAssetAmount.should.be.equal("50000");
          orders[1].maker.should.be.equal(maker1);
        });

        it("should get time range (timeFrom, timeTo)", async function () {
          let orders = await this.exchange.getOrders(
            this.erc20Ask.address,
            this.erc20Bid.address,
            0,
            maker1,
            this.timeStart.add(time.duration.seconds(3)),
            this.timeEnd.sub(time.duration.seconds(3))
          );

          orders.length.should.be.equal(1);
          orders[0].bidAssetAmount.should.be.equal("50000");
          orders[0].maker.should.be.equal(maker1);
        });
      });
    });

    describe("fillable", function () {
      context("without maker", function () {
        it("should get all orders", async function () {
          let orders = await this.exchange.getOrders(
            this.erc20Ask.address,
            this.erc20Bid.address,
            1,
            ZERO_ADDRESS,
            0,
            0
          );

          orders.length.should.be.equal(2);
          orders[0].bidAssetAmount.should.be.equal("10000");
          orders[0].maker.should.be.equal(maker1);
          orders[1].bidAssetAmount.should.be.equal("40000");
          orders[1].maker.should.be.equal(maker3);
        });

        it("should get time range (timeFrom)", async function () {
          let orders = await this.exchange.getOrders(
            this.erc20Ask.address,
            this.erc20Bid.address,
            1,
            ZERO_ADDRESS,
            this.timeStart.add(time.duration.seconds(3)),
            0
          );

          orders.length.should.be.equal(1);
          orders[0].bidAssetAmount.should.be.equal("40000");
          orders[0].maker.should.be.equal(maker3);
        });

        it("should get time range (timeTo)", async function () {
          let orders = await this.exchange.getOrders(
            this.erc20Ask.address,
            this.erc20Bid.address,
            1,
            ZERO_ADDRESS,
            0,
            this.timeEnd.sub(time.duration.seconds(3))
          );

          orders.length.should.be.equal(2);
          orders[0].bidAssetAmount.should.be.equal("10000");
          orders[0].maker.should.be.equal(maker1);
          orders[1].bidAssetAmount.should.be.equal("40000");
          orders[1].maker.should.be.equal(maker3);
        });

        it("should get time range (timeFrom, timeTo)", async function () {
          let orders = await this.exchange.getOrders(
            this.erc20Ask.address,
            this.erc20Bid.address,
            1,
            ZERO_ADDRESS,
            this.timeStart.add(time.duration.seconds(3)),
            this.timeEnd.sub(time.duration.seconds(3))
          );

          orders.length.should.be.equal(1);
          orders[0].bidAssetAmount.should.be.equal("40000");
          orders[0].maker.should.be.equal(maker3);
        });
      });

      context("with maker", function() {
        it("should get all orders", async function() {
          let orders = await this.exchange.getOrders(
            this.erc20Ask.address,
            this.erc20Bid.address,
            1,
            maker1,
            0,
            0
          );

          orders.length.should.be.equal(1);
          orders[0].bidAssetAmount.should.be.equal("10000");
          orders[0].maker.should.be.equal(maker1);
        });

        it("should get time range (timeFrom)", async function() {
          let orders = await this.exchange.getOrders(
            this.erc20Ask.address,
            this.erc20Bid.address,
            1,
            maker3,
            this.timeStart.add(time.duration.seconds(3)),
            0
          );

          orders.length.should.be.equal(1);
          orders[0].bidAssetAmount.should.be.equal("40000");
          orders[0].maker.should.be.equal(maker3);
        });

        it("should get time range (timeTo)", async function() {
          let orders = await this.exchange.getOrders(
            this.erc20Ask.address,
            this.erc20Bid.address,
            1,
            maker1,
            0,
            this.timeEnd.sub(time.duration.seconds(3))
          );

          orders.length.should.be.equal(1);
          orders[0].bidAssetAmount.should.be.equal("10000");
          orders[0].maker.should.be.equal(maker1);
        });

        it("should get time range (timeFrom, timeTo)", async function() {
          let orders = await this.exchange.getOrders(
            this.erc20Ask.address,
            this.erc20Bid.address,
            1,
            maker3,
            this.timeStart.add(time.duration.seconds(3)),
            this.timeEnd.sub(time.duration.seconds(3))
          );

          orders.length.should.be.equal(1);
          orders[0].bidAssetAmount.should.be.equal("40000");
          orders[0].maker.should.be.equal(maker3);
        });
      });
    });

    describe("filled", function() {
      context("without maker", function() {
        it("should get all orders", async function() {
          let orders = await this.exchange.getOrders(
            this.erc20Ask.address,
            this.erc20Bid.address,
            2,
            ZERO_ADDRESS,
            0,
            0
          );

          orders.length.should.be.equal(2);
          orders[0].bidAssetAmount.should.be.equal("20000");
          orders[0].maker.should.be.equal(maker3);
          orders[1].bidAssetAmount.should.be.equal("60000");
          orders[1].maker.should.be.equal(maker2);
        });

        it("should get time range (timeFrom)", async function() {
          let orders = await this.exchange.getOrders(
            this.erc20Ask.address,
            this.erc20Bid.address,
            2,
            ZERO_ADDRESS,
            this.timeStart.add(time.duration.seconds(3)),
            0
          );

          orders.length.should.be.equal(2);
          orders[0].bidAssetAmount.should.be.equal("20000");
          orders[0].maker.should.be.equal(maker3);
          orders[1].bidAssetAmount.should.be.equal("60000");
          orders[1].maker.should.be.equal(maker2);
        });

        it("should get time range (timeTo)", async function() {
          let orders = await this.exchange.getOrders(
            this.erc20Ask.address,
            this.erc20Bid.address,
            2,
            ZERO_ADDRESS,
            0,
            this.timeEnd.sub(time.duration.seconds(3))
          );

          orders.length.should.be.equal(1);
          orders[0].bidAssetAmount.should.be.equal("20000");
          orders[0].maker.should.be.equal(maker3);
        });

        it("should get time range (timeFrom, timeTo)", async function() {
          let orders = await this.exchange.getOrders(
            this.erc20Ask.address,
            this.erc20Bid.address,
            2,
            ZERO_ADDRESS,
            this.timeStart.add(time.duration.seconds(3)),
            this.timeEnd.sub(time.duration.seconds(3))
          );

          orders.length.should.be.equal(1);
          orders[0].bidAssetAmount.should.be.equal("20000");
          orders[0].maker.should.be.equal(maker3);
        });
      });

      context("with maker", function() {
        it("should get all orders", async function() {
          let orders = await this.exchange.getOrders(
            this.erc20Ask.address,
            this.erc20Bid.address,
            2,
            maker3,
            0,
            0
          );

          orders.length.should.be.equal(1);
          orders[0].bidAssetAmount.should.be.equal("20000");
          orders[0].maker.should.be.equal(maker3);
        });

        it("should get time range (timeFrom)", async function() {
          let orders = await this.exchange.getOrders(
            this.erc20Ask.address,
            this.erc20Bid.address,
            2,
            maker2,
            this.timeStart.add(time.duration.seconds(3)),
            0
          );

          orders.length.should.be.equal(1);
          orders[0].bidAssetAmount.should.be.equal("60000");
          orders[0].maker.should.be.equal(maker2);
        });

        it("should get time range (timeTo)", async function() {
          let orders = await this.exchange.getOrders(
            this.erc20Ask.address,
            this.erc20Bid.address,
            2,
            maker3,
            0,
            this.timeEnd.sub(time.duration.seconds(3))
          );

          orders.length.should.be.equal(1);
          orders[0].bidAssetAmount.should.be.equal("20000");
          orders[0].maker.should.be.equal(maker3);
        });

        it("should get time range (timeFrom, timeTo)", async function() {
          let orders = await this.exchange.getOrders(
            this.erc20Ask.address,
            this.erc20Bid.address,
            2,
            maker3,
            this.timeStart.add(time.duration.seconds(3)),
            this.timeEnd.sub(time.duration.seconds(3))
          );

          orders.length.should.be.equal(1);
          orders[0].bidAssetAmount.should.be.equal("20000");
          orders[0].maker.should.be.equal(maker3);
        });
      });
    });
  });

  describe("cancelled", function () {
    context("without maker", function () {
      it("should get all orders", async function () {
        let orders = await this.exchange.getOrders(
          this.erc20Ask.address,
          this.erc20Bid.address,
          3,
          ZERO_ADDRESS,
          0,
          0
        );

        orders.length.should.be.equal(2);
        orders[0].bidAssetAmount.should.be.equal("30000");
        orders[0].maker.should.be.equal(maker2);
        orders[1].bidAssetAmount.should.be.equal("50000");
        orders[1].maker.should.be.equal(maker1);
      });

      it("should get time range (timeFrom)", async function () {
        let orders = await this.exchange.getOrders(
          this.erc20Ask.address,
          this.erc20Bid.address,
          3,
          ZERO_ADDRESS,
          this.timeStart.add(time.duration.seconds(3)),
          0
        );

        orders.length.should.be.equal(2);
        orders[0].bidAssetAmount.should.be.equal("30000");
        orders[0].maker.should.be.equal(maker2);
        orders[1].bidAssetAmount.should.be.equal("50000");
        orders[1].maker.should.be.equal(maker1);
      });

      it("should get time range (timeTo)", async function () {
        let orders = await this.exchange.getOrders(
          this.erc20Ask.address,
          this.erc20Bid.address,
          3,
          ZERO_ADDRESS,
          0,
          this.timeEnd.sub(time.duration.seconds(3))
        );

        orders.length.should.be.equal(2);
        orders[0].bidAssetAmount.should.be.equal("30000");
        orders[0].maker.should.be.equal(maker2);
        orders[1].bidAssetAmount.should.be.equal("50000");
        orders[1].maker.should.be.equal(maker1);
      });

      it("should get time range (timeFrom, timeTo)", async function () {
        let orders = await this.exchange.getOrders(
          this.erc20Ask.address,
          this.erc20Bid.address,
          3,
          ZERO_ADDRESS,
          this.timeStart.add(time.duration.seconds(3)),
          this.timeEnd.sub(time.duration.seconds(3))
        );

        orders.length.should.be.equal(2);
        orders[0].bidAssetAmount.should.be.equal("30000");
        orders[0].maker.should.be.equal(maker2);
        orders[1].bidAssetAmount.should.be.equal("50000");
        orders[1].maker.should.be.equal(maker1);
      });
    });

    context("with maker", function () {
      it("should get all orders", async function () {
        let orders = await this.exchange.getOrders(
          this.erc20Ask.address,
          this.erc20Bid.address,
          3,
          maker2,
          0,
          0
        );

        orders.length.should.be.equal(1);
        orders[0].bidAssetAmount.should.be.equal("30000");
        orders[0].maker.should.be.equal(maker2);
      });

      it("should get time range (timeFrom)", async function () {
        let orders = await this.exchange.getOrders(
          this.erc20Ask.address,
          this.erc20Bid.address,
          3,
          maker2,
          this.timeStart.add(time.duration.seconds(3)),
          0
        );

        orders.length.should.be.equal(1);
        orders[0].bidAssetAmount.should.be.equal("30000");
        orders[0].maker.should.be.equal(maker2);
      });

      it("should get time range (timeTo)", async function () {
        let orders = await this.exchange.getOrders(
          this.erc20Ask.address,
          this.erc20Bid.address,
          3,
          maker1,
          0,
          this.timeEnd.sub(time.duration.seconds(3))
        );

        orders.length.should.be.equal(1);
        orders[0].bidAssetAmount.should.be.equal("50000");
        orders[0].maker.should.be.equal(maker1);
      });

      it("should get time range (timeFrom, timeTo)", async function () {
        let orders = await this.exchange.getOrders(
          this.erc20Ask.address,
          this.erc20Bid.address,
          3,
          maker2,
          this.timeStart.add(time.duration.seconds(3)),
          this.timeEnd.sub(time.duration.seconds(3))
        );

        orders.length.should.be.equal(1);
        orders[0].bidAssetAmount.should.be.equal("30000");
        orders[0].maker.should.be.equal(maker2);
      });
    });
  });
});
