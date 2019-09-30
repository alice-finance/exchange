const Exchange = artifacts.require("./exchange/Exchange.sol");
const ERC20Proxy = artifacts.require("./proxy/ERC20Proxy.sol");
const ERC721Proxy = artifacts.require("./proxy/ERC721Proxy.sol");
const ERC20 = artifacts.require("./mock/ERC20Mock.sol");
const ERC721 = artifacts.require("./mock/ERC721Mock.sol");

const { BN, constants, expectEvent, shouldFail } = require("openzeppelin-test-helpers");
const { expect } = require("chai");
const { ZERO_ADDRESS } = constants;

contract("Exchange.fillOrders", function([admin, owner, user1, user2, user3, user4, user5, user6, user7, user8]) {
  const LIMIT = new BN("2", 10).pow(new BN("128", 10)).sub(new BN("1"));
  const ERC20_PROXY_ID = "0xcc4aa204";
  const ERC721_PROXY_ID = "0x9013e617";
  const erc20AskValue = new BN("10000");
  const erc20Bid1Value = new BN("10000");
  const erc20Bid2Value = new BN("20000");
  const erc20Bid3Value = new BN("30000");
  const erc20Bid4Value = new BN("40000");
  const erc20Bid5Value = new BN("50000");
  const erc20Bid6Value = new BN("60000");
  const erc20BidValue = erc20Bid1Value
    .add(erc20Bid2Value)
    .add(erc20Bid3Value)
    .add(erc20Bid4Value)
    .add(erc20Bid5Value)
    .add(erc20Bid6Value);

  async function initializeExchange(exchange, owner) {
    const signature = "initialize(address)";
    const args = [owner];
    await exchange.methods[signature](...args, { from: admin });
  }

  beforeEach(async function() {
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

    await this.exchange.createOrder(
      {
        askAssetProxyId: ERC20_PROXY_ID,
        askAssetAddress: this.erc20Ask.address,
        askAssetAmount: erc20AskValue.toString(),
        askAssetData: "0x00",
        bidAssetProxyId: ERC20_PROXY_ID,
        bidAssetAddress: this.erc20Bid.address,
        bidAssetAmount: erc20Bid1Value.toString(),
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
        bidAssetAmount: erc20Bid2Value.toString(),
        bidAssetData: "0x00",
        feeAmount: 0
      },
      { from: user2 }
    );

    await this.exchange.createOrder(
      {
        askAssetProxyId: ERC20_PROXY_ID,
        askAssetAddress: this.erc20Ask.address,
        askAssetAmount: erc20AskValue.toString(),
        askAssetData: "0x00",
        bidAssetProxyId: ERC20_PROXY_ID,
        bidAssetAddress: this.erc20Bid.address,
        bidAssetAmount: erc20Bid3Value.toString(),
        bidAssetData: "0x00",
        feeAmount: 0
      },
      { from: user3 }
    );

    await this.exchange.createOrder(
      {
        askAssetProxyId: ERC20_PROXY_ID,
        askAssetAddress: this.erc20Ask.address,
        askAssetAmount: erc20AskValue.toString(),
        askAssetData: "0x00",
        bidAssetProxyId: ERC20_PROXY_ID,
        bidAssetAddress: this.erc20Bid.address,
        bidAssetAmount: erc20Bid4Value.toString(),
        bidAssetData: "0x00",
        feeAmount: 0
      },
      { from: user4 }
    );

    await this.exchange.createOrder(
      {
        askAssetProxyId: ERC20_PROXY_ID,
        askAssetAddress: this.erc20Ask.address,
        askAssetAmount: erc20AskValue.toString(),
        askAssetData: "0x00",
        bidAssetProxyId: ERC20_PROXY_ID,
        bidAssetAddress: this.erc20Bid.address,
        bidAssetAmount: erc20Bid5Value.toString(),
        bidAssetData: "0x00",
        feeAmount: 0
      },
      { from: user5 }
    );

    await this.exchange.createOrder(
      {
        askAssetProxyId: ERC20_PROXY_ID,
        askAssetAddress: this.erc20Ask.address,
        askAssetAmount: erc20AskValue.toString(),
        askAssetData: "0x00",
        bidAssetProxyId: ERC20_PROXY_ID,
        bidAssetAddress: this.erc20Bid.address,
        bidAssetAmount: erc20Bid6Value.toString(),
        bidAssetData: "0x00",
        feeAmount: 0
      },
      { from: user6 }
    );
  });

  describe("fill orders", function() {
    it("should fill all orders", async function() {
      const { logs } = await this.exchange.fillOrders(
        {
          askAssetAddress: this.erc20Ask.address,
          bidAssetAddress: this.erc20Bid.address,
          nonces: [0, 1, 2, 3, 4, 5],
          bidAssetAmountToFill: erc20BidValue.toString(),
          feeAmount: 0
        },
        { from: user7 }
      );

      expectEvent.inLogs(logs, "OrderFilled", { status: new BN("2") });
      // expectEvent.inLogs(logs, "OrderFilled", { nonce: new BN("0"), status: new BN("2") });
      // expectEvent.inLogs(logs, "OrderFilled", { nonce: new BN("1"), status: new BN("2") });
      // expectEvent.inLogs(logs, "OrderFilled", { nonce: new BN("2"), status: new BN("2") });
      // expectEvent.inLogs(logs, "OrderFilled", { nonce: new BN("3"), status: new BN("2") });
      // expectEvent.inLogs(logs, "OrderFilled", { nonce: new BN("4"), status: new BN("2") });
      // expectEvent.inLogs(logs, "OrderFilled", { nonce: new BN("5"), status: new BN("2") });

      expect(await this.erc20Bid.balanceOf(user1)).to.be.bignumber.equal(erc20Bid1Value);
      expect(await this.erc20Bid.balanceOf(user2)).to.be.bignumber.equal(erc20Bid2Value);
      expect(await this.erc20Bid.balanceOf(user3)).to.be.bignumber.equal(erc20Bid3Value);
      expect(await this.erc20Bid.balanceOf(user4)).to.be.bignumber.equal(erc20Bid4Value);
      expect(await this.erc20Bid.balanceOf(user5)).to.be.bignumber.equal(erc20Bid5Value);
      expect(await this.erc20Bid.balanceOf(user6)).to.be.bignumber.equal(erc20Bid6Value);
      expect(await this.erc20Ask.balanceOf(user7)).to.be.bignumber.equal(erc20AskValue.mul(new BN("6")));
    });

    it("should fill only amount", async function() {
      const { logs } = await this.exchange.fillOrders(
        {
          askAssetAddress: this.erc20Ask.address,
          bidAssetAddress: this.erc20Bid.address,
          nonces: [0, 1, 2, 3, 4, 5],
          bidAssetAmountToFill: erc20Bid1Value
            .add(erc20Bid2Value)
            .add(erc20Bid3Value)
            .add(erc20Bid4Value)
            .toString(),
          feeAmount: 0
        },
        { from: user7 }
      );

      expectEvent.inLogs(logs, "OrderFilled", { status: new BN("2") });
      // expectEvent.inLogs(logs, "OrderFilled", { nonce: new BN("0"), status: new BN("2") });
      // expectEvent.inLogs(logs, "OrderFilled", { nonce: new BN("1"), status: new BN("2") });
      // expectEvent.inLogs(logs, "OrderFilled", { nonce: new BN("2"), status: new BN("2") });
      // expectEvent.inLogs(logs, "OrderFilled", { nonce: new BN("3"), status: new BN("2") });

      expect(await this.erc20Bid.balanceOf(user1)).to.be.bignumber.equal(erc20Bid1Value);
      expect(await this.erc20Bid.balanceOf(user2)).to.be.bignumber.equal(erc20Bid2Value);
      expect(await this.erc20Bid.balanceOf(user3)).to.be.bignumber.equal(erc20Bid3Value);
      expect(await this.erc20Bid.balanceOf(user4)).to.be.bignumber.equal(erc20Bid4Value);
      expect(await this.erc20Bid.balanceOf(user5)).to.be.bignumber.equal(new BN("0"));
      expect(await this.erc20Bid.balanceOf(user6)).to.be.bignumber.equal(new BN("0"));
      expect(await this.erc20Ask.balanceOf(user7)).to.be.bignumber.equal(erc20AskValue.mul(new BN("4")));
    });

    it("should fill if some orders are already filled", async function() {
      await this.erc20Bid.mint(user8, erc20BidValue, { from: admin });
      await this.erc20Bid.approve(this.erc20Proxy.address, LIMIT, { from: user8 });

      await this.exchange.fillOrders(
        {
          askAssetAddress: this.erc20Ask.address,
          bidAssetAddress: this.erc20Bid.address,
          nonces: [4, 2, 0],
          bidAssetAmountToFill: erc20Bid1Value
            .add(erc20Bid3Value)
            .add(erc20Bid5Value)
            .toString(),
          feeAmount: 0
        },
        { from: user7 }
      );

      const { logs } = await this.exchange.fillOrders(
        {
          askAssetAddress: this.erc20Ask.address,
          bidAssetAddress: this.erc20Bid.address,
          nonces: [5, 4, 3, 2, 1, 0],
          bidAssetAmountToFill: erc20BidValue.toString(),
          feeAmount: 0
        },
        { from: user8 }
      );

      // expectEvent.inLogs(logs, "OrderFilled", { nonce: new BN("1"), status: new BN("2") });
      // expectEvent.inLogs(logs, "OrderFilled", { nonce: new BN("3"), status: new BN("2") });
      // expectEvent.inLogs(logs, "OrderFilled", { nonce: new BN("5"), status: new BN("2") });

      expect(await this.erc20Bid.balanceOf(user1)).to.be.bignumber.equal(erc20Bid1Value);
      expect(await this.erc20Bid.balanceOf(user2)).to.be.bignumber.equal(erc20Bid2Value);
      expect(await this.erc20Bid.balanceOf(user3)).to.be.bignumber.equal(erc20Bid3Value);
      expect(await this.erc20Bid.balanceOf(user4)).to.be.bignumber.equal(erc20Bid4Value);
      expect(await this.erc20Bid.balanceOf(user5)).to.be.bignumber.equal(erc20Bid5Value);
      expect(await this.erc20Bid.balanceOf(user6)).to.be.bignumber.equal(erc20Bid6Value);
      expect(await this.erc20Ask.balanceOf(user7)).to.be.bignumber.equal(erc20AskValue.mul(new BN("3")));
      expect(await this.erc20Ask.balanceOf(user8)).to.be.bignumber.equal(erc20AskValue.mul(new BN("3")));
    });

    it("should revert if given address is ZERO", async function() {
      await shouldFail.reverting(
        this.exchange.fillOrders(
          {
            askAssetAddress: ZERO_ADDRESS,
            bidAssetAddress: this.erc20Bid.address,
            nonces: [0, 1, 2, 3, 4, 5],
            bidAssetAmountToFill: erc20BidValue.toString(),
            feeAmount: 0
          },
          { from: user7 }
        )
      );

      await shouldFail.reverting(
        this.exchange.fillOrders(
          {
            askAssetAddress: this.erc20Ask.address,
            bidAssetAddress: ZERO_ADDRESS,
            nonces: [0, 1, 2, 3, 4, 5],
            bidAssetAmountToFill: erc20BidValue.toString(),
            feeAmount: 0
          },
          { from: user7 }
        )
      );
    });

    it("should revert if nonces are not provided", async function() {
      await shouldFail.reverting(
        this.exchange.fillOrders(
          {
            askAssetAddress: this.erc20Ask.address,
            bidAssetAddress: this.erc20Bid.address,
            nonces: [],
            bidAssetAmountToFill: erc20BidValue.toString(),
            feeAmount: 0
          },
          { from: user7 }
        )
      );
    });

    it("should revert if some provided nonces are invalid", async function() {
      await shouldFail.reverting(
        this.exchange.fillOrders(
          {
            askAssetAddress: this.erc20Ask.address,
            bidAssetAddress: this.erc20Bid.address,
            nonces: [5, 3, 7, 1, 9],
            bidAssetAmountToFill: erc20BidValue.toString(),
            feeAmount: 0
          },
          { from: user7 }
        )
      );
    });

    it("should revert if bid fill amount is 0", async function() {
      await shouldFail.reverting(
        this.exchange.fillOrders(
          {
            askAssetAddress: this.erc20Ask.address,
            bidAssetAddress: this.erc20Bid.address,
            nonces: [0, 1, 2, 3, 4, 5],
            bidAssetAmountToFill: new BN("0").toString(),
            feeAmount: 0
          },
          { from: user7 }
        )
      );
    });

    it("should revert if bid fill amount exceeded LIMIT", async function() {
      await shouldFail.reverting(
        this.exchange.fillOrders(
          {
            askAssetAddress: this.erc20Ask.address,
            bidAssetAddress: this.erc20Bid.address,
            nonces: [0, 1, 2, 3, 4, 5],
            bidAssetAmountToFill: LIMIT.add(new BN("1")).toString(),
            feeAmount: 0
          },
          { from: user7 }
        )
      );
    });

    it("should revert if filled nothing", async function() {
      await this.erc20Bid.mint(user8, erc20BidValue, { from: admin });
      await this.erc20Bid.approve(this.erc20Proxy.address, LIMIT, { from: user8 });

      await this.exchange.fillOrders(
        {
          askAssetAddress: this.erc20Ask.address,
          bidAssetAddress: this.erc20Bid.address,
          nonces: [0, 1, 2, 3, 4, 5],
          bidAssetAmountToFill: erc20BidValue.toString(),
          feeAmount: 0
        },
        { from: user7 }
      );

      await shouldFail.reverting(
        this.exchange.fillOrders(
          {
            askAssetAddress: this.erc20Ask.address,
            bidAssetAddress: this.erc20Bid.address,
            nonces: [0, 1, 2, 3, 4, 5],
            bidAssetAmountToFill: erc20BidValue.toString(),
            feeAmount: 0
          },
          { from: user8 }
        )
      );
    });
  });

  describe("fill and create orders", function() {
    it("should create new order", async function() {
      const overfillAmount = erc20Bid4Value;
      const overfillValue = erc20BidValue.add(overfillAmount);
      const expectedNewAskAssetAmount = overfillAmount;
      const expectedNewBidAssetAmount = expectedNewAskAssetAmount.mul(erc20AskValue).div(erc20Bid1Value);

      const { logs } = await this.exchange.fillAndCreateOrders(
        {
          askAssetAddress: this.erc20Ask.address,
          bidAssetAddress: this.erc20Bid.address,
          nonces: [0, 1, 2, 3, 4, 5],
          bidAssetAmountToFill: overfillValue.toString(),
          feeAmount: 0
        },
        { from: user7 }
      );

      expectEvent.inLogs(logs, "OrderFilled", { status: new BN("2") });
      // expectEvent.inLogs(logs, "OrderFilled", { nonce: new BN("0"), status: new BN("2") });
      // expectEvent.inLogs(logs, "OrderFilled", { nonce: new BN("1"), status: new BN("2") });
      // expectEvent.inLogs(logs, "OrderFilled", { nonce: new BN("2"), status: new BN("2") });
      // expectEvent.inLogs(logs, "OrderFilled", { nonce: new BN("3"), status: new BN("2") });
      // expectEvent.inLogs(logs, "OrderFilled", { nonce: new BN("4"), status: new BN("2") });
      // expectEvent.inLogs(logs, "OrderFilled", { nonce: new BN("5"), status: new BN("2") });

      expect(await this.erc20Bid.balanceOf(user1)).to.be.bignumber.equal(erc20Bid1Value);
      expect(await this.erc20Bid.balanceOf(user2)).to.be.bignumber.equal(erc20Bid2Value);
      expect(await this.erc20Bid.balanceOf(user3)).to.be.bignumber.equal(erc20Bid3Value);
      expect(await this.erc20Bid.balanceOf(user4)).to.be.bignumber.equal(erc20Bid4Value);
      expect(await this.erc20Bid.balanceOf(user5)).to.be.bignumber.equal(erc20Bid5Value);
      expect(await this.erc20Bid.balanceOf(user6)).to.be.bignumber.equal(erc20Bid6Value);
      expect(await this.erc20Ask.balanceOf(user7)).to.be.bignumber.equal(erc20AskValue.mul(new BN("6")));

      expectEvent.inLogs(logs, "OrderCreated", {
        askAssetAddress: this.erc20Bid.address,
        askAssetAmount: expectedNewAskAssetAmount,
        bidAssetAddress: this.erc20Ask.address,
        bidAssetAmount: expectedNewBidAssetAmount
      });
    });
  });
});
