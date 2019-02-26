const Exchange = artifacts.require("./exchange/Exchange.sol");
const ERC20Proxy = artifacts.require("./proxy/ERC20Proxy.sol");
const ERC721Proxy = artifacts.require("./proxy/ERC721Proxy.sol");
const ERC20 = artifacts.require("./mock/ERC20Mock.sol");
const ERC721 = artifacts.require("./mock/ERC721Mock.sol");

const { BN, constants, expectEvent, shouldFail } = require("openzeppelin-test-helpers");
const { ZERO_ADDRESS } = constants;

contract("Exchange.fillOrders", function ([admin, owner, user1, user2, user3, user4, user5, user6, user7, user8]) {
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

  beforeEach(async function () {
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

    await this.erc20Ask.mint(user1, erc20AskValue, { from: admin });
    await this.erc20Ask.mint(user2, erc20AskValue, { from: admin });
    await this.erc20Ask.mint(user3, erc20AskValue, { from: admin });
    await this.erc20Ask.mint(user4, erc20AskValue, { from: admin });
    await this.erc20Ask.mint(user5, erc20AskValue, { from: admin });
    await this.erc20Ask.mint(user6, erc20AskValue, { from: admin });
    await this.erc20Bid.mint(user7, erc20BidValue, { from: admin });
    await this.erc20Ask.approve(this.erc20Proxy.address, LIMIT, { from: user1 });
    await this.erc20Ask.approve(this.erc20Proxy.address, LIMIT, { from: user2 });
    await this.erc20Ask.approve(this.erc20Proxy.address, LIMIT, { from: user3 });
    await this.erc20Ask.approve(this.erc20Proxy.address, LIMIT, { from: user4 });
    await this.erc20Ask.approve(this.erc20Proxy.address, LIMIT, { from: user5 });
    await this.erc20Ask.approve(this.erc20Proxy.address, LIMIT, { from: user6 });
    await this.erc20Bid.approve(this.erc20Proxy.address, LIMIT, { from: user7 });

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
    }, { from: user1 });

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
    }, { from: user2 });

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
    }, { from: user3 });

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
    }, { from: user4 });

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
    }, { from: user5 });

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
    }, { from: user6 });
  });

  describe("fill orders", function () {
    it("should fill all orders", async function () {
      const { logs } = await this.exchange.fillOrders({
        askAssetAddress: this.erc20Ask.address,
        bidAssetAddress: this.erc20Bid.address,
        nonces: [0, 1, 2, 3, 4, 5],
        bidAssetAmountToFill: new BN("210000").toString(),
        feeAmount: 0
      }, { from: user7 });

      expectEvent.inLogs(logs, "OrderFilled", { status: new BN("2") });

      (await this.erc20Bid.balanceOf(user1)).should.be.bignumber.equal(new BN("10000"));
      (await this.erc20Bid.balanceOf(user2)).should.be.bignumber.equal(new BN("20000"));
      (await this.erc20Bid.balanceOf(user3)).should.be.bignumber.equal(new BN("30000"));
      (await this.erc20Bid.balanceOf(user4)).should.be.bignumber.equal(new BN("40000"));
      (await this.erc20Bid.balanceOf(user5)).should.be.bignumber.equal(new BN("50000"));
      (await this.erc20Bid.balanceOf(user6)).should.be.bignumber.equal(new BN("60000"));
      (await this.erc20Ask.balanceOf(user7)).should.be.bignumber.equal(erc20AskValue.mul(new BN("6")));
    });

    it("should fill only amount", async function () {
      const { logs } = await this.exchange.fillOrders(
        {
          askAssetAddress: this.erc20Ask.address,
          bidAssetAddress: this.erc20Bid.address,
          nonces: [0, 1, 2, 3, 4, 5],
          bidAssetAmountToFill: new BN("100001").toString(),
          feeAmount: 0
        },
        { from: user7 }
      );

      expectEvent.inLogs(logs, "OrderFilled", { status: new BN("2") });

      (await this.erc20Bid.balanceOf(user1)).should.be.bignumber.equal(new BN("10000"));
      (await this.erc20Bid.balanceOf(user2)).should.be.bignumber.equal(new BN("20000"));
      (await this.erc20Bid.balanceOf(user3)).should.be.bignumber.equal(new BN("30000"));
      (await this.erc20Bid.balanceOf(user4)).should.be.bignumber.equal(new BN("40000"));
      (await this.erc20Bid.balanceOf(user5)).should.be.bignumber.equal(new BN("0"));
      (await this.erc20Bid.balanceOf(user6)).should.be.bignumber.equal(new BN("0"));
      (await this.erc20Ask.balanceOf(user7)).should.be.bignumber.equal(new BN("40000"));
    });

    it("should fill if some orders are already filled", async function() {
      await this.erc20Bid.mint(user8, erc20BidValue, { from: admin });
      await this.erc20Bid.approve(this.erc20Proxy.address, LIMIT, { from: user8 });

      await this.exchange.fillOrders(
        {
          askAssetAddress: this.erc20Ask.address,
          bidAssetAddress: this.erc20Bid.address,
          nonces: [4, 2, 0],
          bidAssetAmountToFill: new BN("90000").toString(),
          feeAmount: 0
        },
        { from: user7 }
      );

      const { logs } = await this.exchange.fillOrders(
        {
          askAssetAddress: this.erc20Ask.address,
          bidAssetAddress: this.erc20Bid.address,
          nonces: [5, 4, 3, 2, 1, 0],
          bidAssetAmountToFill: new BN("210000").toString(),
          feeAmount: 0
        },
        { from: user8 }
      );

      (await this.erc20Bid.balanceOf(user1)).should.be.bignumber.equal(new BN("10000"));
      (await this.erc20Bid.balanceOf(user2)).should.be.bignumber.equal(new BN("20000"));
      (await this.erc20Bid.balanceOf(user3)).should.be.bignumber.equal(new BN("30000"));
      (await this.erc20Bid.balanceOf(user4)).should.be.bignumber.equal(new BN("40000"));
      (await this.erc20Bid.balanceOf(user5)).should.be.bignumber.equal(new BN("50000"));
      (await this.erc20Bid.balanceOf(user6)).should.be.bignumber.equal(new BN("60000"));
      (await this.erc20Ask.balanceOf(user7)).should.be.bignumber.equal(new BN("30000"));
      (await this.erc20Ask.balanceOf(user8)).should.be.bignumber.equal(new BN("30000"));
    });

    it("should revert if given address is ZERO", async function () {
      await shouldFail.reverting(
        this.exchange.fillOrders({
          askAssetAddress: ZERO_ADDRESS,
          bidAssetAddress: this.erc20Bid.address,
          nonces: [0, 1, 2, 3, 4, 5],
          bidAssetAmountToFill: new BN("210000").toString(),
          feeAmount: 0
        }, { from: user7 })
      );

      await shouldFail.reverting(
        this.exchange.fillOrders({
          askAssetAddress: this.erc20Ask.address,
          bidAssetAddress: ZERO_ADDRESS,
          nonces: [0, 1, 2, 3, 4, 5],
          bidAssetAmountToFill: new BN("210000").toString(),
          feeAmount: 0
        }, { from: user7 })
      );
    });

    it("should revert if nonces are not provided", async function() {
      await shouldFail.reverting(
        this.exchange.fillOrders({
          askAssetAddress: this.erc20Ask.address,
          bidAssetAddress: this.erc20Bid.address,
          nonces: [],
          bidAssetAmountToFill: new BN("210000").toString(),
          feeAmount: 0
        }, { from: user7 })
      );
    });

    it("should revert if some provided nonces are invalid", async function() {
      await shouldFail.reverting(
        this.exchange.fillOrders({
          askAssetAddress: this.erc20Ask.address,
          bidAssetAddress: this.erc20Bid.address,
          nonces: [5, 3, 7, 1, 9],
          bidAssetAmountToFill: new BN("210000").toString(),
          feeAmount: 0
        }, { from: user7 })
      );
    });

    it("should revert if bid fill amount is 0", async function () {
      await shouldFail.reverting(
        this.exchange.fillOrders({
          askAssetAddress: this.erc20Ask.address,
          bidAssetAddress: this.erc20Bid.address,
          nonces: [0, 1, 2, 3, 4, 5],
          bidAssetAmountToFill: new BN("0").toString(),
          feeAmount: 0
        }, { from: user7 })
      );
    });

    it("should revert if bid fill amount exceeded LIMIT", async function() {
      await shouldFail.reverting(
        this.exchange.fillOrders({
          askAssetAddress: this.erc20Ask.address,
          bidAssetAddress: this.erc20Bid.address,
          nonces: [0, 1, 2, 3, 4, 5],
          bidAssetAmountToFill: LIMIT.add(new BN("1")).toString(),
          feeAmount: 0
        }, { from: user7 })
      );
    });

    it("should revert if filled nothing", async function () {
      await this.erc20Bid.mint(user8, erc20BidValue, { from: admin });
      await this.erc20Bid.approve(this.erc20Proxy.address, LIMIT, { from: user8 });

      await this.exchange.fillOrders({
        askAssetAddress: this.erc20Ask.address,
        bidAssetAddress: this.erc20Bid.address,
        nonces: [0, 1, 2, 3, 4, 5],
        bidAssetAmountToFill: new BN("210000").toString(),
        feeAmount: 0
      }, { from: user7 });

      await shouldFail.reverting(
        this.exchange.fillOrders({
          askAssetAddress: this.erc20Ask.address,
          bidAssetAddress: this.erc20Bid.address,
          nonces: [0, 1, 2, 3, 4, 5],
          bidAssetAmountToFill: new BN("210000").toString(),
          feeAmount: 0
        }, { from: user8 })
      );
    });
  });
});
