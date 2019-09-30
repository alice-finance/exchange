const Exchange = artifacts.require("./exchange/Exchange.sol");
const ERC20Proxy = artifacts.require("./proxy/ERC20Proxy.sol");
const ERC721Proxy = artifacts.require("./proxy/ERC721Proxy.sol");
const ERC20 = artifacts.require("./mock/ERC20Mock.sol");
const ERC721 = artifacts.require("./mock/ERC721Mock.sol");

const { BN, constants, expectEvent, shouldFail } = require("openzeppelin-test-helpers");
const { expect } = require("chai");
const { ZERO_ADDRESS } = constants;

contract("Exchange.createOrder", function([admin, owner, user1, user2]) {
  const LIMIT = new BN("2", 10).pow(new BN("128", 10)).sub(new BN("1"));
  const ERC20_PROXY_ID = "0xcc4aa204";
  const ERC721_PROXY_ID = "0x9013e617";
  const erc20AskValue = new BN("10000");
  const erc20BidValue = new BN("20000");
  const erc721AskTokenId = new BN("1");
  const erc721BidTokenId = new BN("2");
  const erc721AskTokenIdData = "0x" + erc721AskTokenId.toString(16, 64);
  const erc721BidTokenIdData = "0x" + erc721BidTokenId.toString(16, 64);

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
    await this.erc721Ask.mint(user1, erc721AskTokenId, { from: admin });
    await this.erc20Bid.mint(user2, erc20BidValue, { from: admin });
    await this.erc721Bid.mint(user2, erc721BidTokenId, { from: admin });
  });

  it("should create erc20 to erc20", async function() {
    await this.erc20Ask.approve(this.erc20Proxy.address, erc20AskValue, { from: user1 });

    let { logs } = await this.exchange.createOrder(
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

    expectEvent.inLogs(logs, "OrderCreated", {
      nonce: new BN("0"),
      maker: user1,
      askAssetProxyId: ERC20_PROXY_ID,
      askAssetAddress: this.erc20Ask.address,
      askAssetAmount: erc20AskValue,
      askAssetData: "0x00",
      bidAssetProxyId: ERC20_PROXY_ID,
      bidAssetAddress: this.erc20Bid.address,
      bidAssetAmount: erc20BidValue,
      bidAssetData: "0x00"
    });

    let order = await this.exchange.getOrder(this.erc20Ask.address, this.erc20Bid.address, new BN("0"));

    expect(order.nonce).to.be.equal("0");
  });

  it("should create erc20 to erc721", async function() {
    await this.erc20Ask.approve(this.erc20Proxy.address, erc20AskValue, { from: user1 });

    let { logs } = await this.exchange.createOrder(
      {
        askAssetProxyId: ERC20_PROXY_ID,
        askAssetAddress: this.erc20Ask.address,
        askAssetAmount: erc20AskValue.toString(),
        askAssetData: "0x00",
        bidAssetProxyId: ERC721_PROXY_ID,
        bidAssetAddress: this.erc721Bid.address,
        bidAssetAmount: 1,
        bidAssetData: erc721BidTokenIdData,
        feeAmount: 0
      },
      { from: user1 }
    );

    expectEvent.inLogs(logs, "OrderCreated", {
      nonce: new BN("0"),
      maker: user1,
      askAssetProxyId: ERC20_PROXY_ID,
      askAssetAddress: this.erc20Ask.address,
      askAssetAmount: erc20AskValue,
      askAssetData: "0x00",
      bidAssetProxyId: ERC721_PROXY_ID,
      bidAssetAddress: this.erc721Bid.address,
      bidAssetAmount: new BN("1"),
      bidAssetData: erc721BidTokenIdData
    });

    let order = await this.exchange.getOrder(this.erc20Ask.address, this.erc721Bid.address, new BN("0"));

    expect(order.nonce).to.be.equal("0");
  });

  it("should create erc721 to erc20", async function() {
    await this.erc721Ask.approve(this.erc721Proxy.address, erc721AskTokenId, { from: user1 });

    let { logs } = await this.exchange.createOrder(
      {
        askAssetProxyId: ERC721_PROXY_ID,
        askAssetAddress: this.erc721Ask.address,
        askAssetAmount: 1,
        askAssetData: erc721AskTokenIdData,
        bidAssetProxyId: ERC20_PROXY_ID,
        bidAssetAddress: this.erc20Bid.address,
        bidAssetAmount: erc20BidValue.toString(),
        bidAssetData: "0x00",
        feeAmount: 0
      },
      { from: user1 }
    );

    expectEvent.inLogs(logs, "OrderCreated", {
      nonce: new BN("0"),
      maker: user1,
      askAssetProxyId: ERC721_PROXY_ID,
      askAssetAddress: this.erc721Ask.address,
      askAssetAmount: new BN("1"),
      askAssetData: erc721AskTokenIdData,
      bidAssetProxyId: ERC20_PROXY_ID,
      bidAssetAddress: this.erc20Bid.address,
      bidAssetAmount: erc20BidValue,
      bidAssetData: "0x00"
    });

    let order = await this.exchange.getOrder(this.erc721Ask.address, this.erc20Bid.address, new BN("0"));

    expect(order.nonce).to.be.equal("0");
  });

  it("should create erc721 to erc721", async function() {
    await this.erc721Ask.approve(this.erc721Proxy.address, erc721AskTokenId, { from: user1 });

    let { logs } = await this.exchange.createOrder(
      {
        askAssetProxyId: ERC721_PROXY_ID,
        askAssetAddress: this.erc721Ask.address,
        askAssetAmount: 1,
        askAssetData: erc721AskTokenIdData,
        bidAssetProxyId: ERC721_PROXY_ID,
        bidAssetAddress: this.erc721Bid.address,
        bidAssetAmount: 1,
        bidAssetData: "0x00",
        feeAmount: 0
      },
      { from: user1 }
    );

    expectEvent.inLogs(logs, "OrderCreated", {
      nonce: new BN("0"),
      maker: user1,
      askAssetProxyId: ERC721_PROXY_ID,
      askAssetAddress: this.erc721Ask.address,
      askAssetAmount: new BN("1"),
      askAssetData: erc721AskTokenIdData,
      bidAssetProxyId: ERC721_PROXY_ID,
      bidAssetAddress: this.erc721Bid.address,
      bidAssetAmount: new BN("1"),
      bidAssetData: "0x00"
    });

    let order = await this.exchange.getOrder(this.erc721Ask.address, this.erc721Bid.address, new BN("0"));

    expect(order.nonce).to.be.equal("0");
  });

  context("should revert", function() {
    beforeEach(async function() {
      await this.erc20Ask.approve(this.erc20Proxy.address, LIMIT, { from: user1 });
    });

    it("when proxy id is 0", async function() {
      await shouldFail.reverting(
        this.exchange.createOrder(
          {
            askAssetProxyId: "0x00",
            askAssetAddress: this.erc20Ask.address,
            askAssetAmount: erc20AskValue.toString(),
            askAssetData: "0x00",
            bidAssetProxyId: ERC721_PROXY_ID,
            bidAssetAddress: this.erc721Bid.address,
            bidAssetAmount: 1,
            bidAssetData: erc721BidTokenIdData,
            feeAmount: 0
          },
          { from: user1 }
        )
      );

      await shouldFail.reverting(
        this.exchange.createOrder(
          {
            askAssetProxyId: ERC20_PROXY_ID,
            askAssetAddress: this.erc20Ask.address,
            askAssetAmount: erc20AskValue.toString(),
            askAssetData: "0x00",
            bidAssetProxyId: "0x00",
            bidAssetAddress: this.erc721Bid.address,
            bidAssetAmount: 1,
            bidAssetData: erc721BidTokenIdData,
            feeAmount: 0
          },
          { from: user1 }
        )
      );
    });

    it("when proxy id is invalid", async function() {
      await shouldFail.reverting(
        this.exchange.createOrder(
          {
            askAssetProxyId: "0x12345678",
            askAssetAddress: this.erc20Ask.address,
            askAssetAmount: erc20AskValue.toString(),
            askAssetData: "0x00",
            bidAssetProxyId: ERC721_PROXY_ID,
            bidAssetAddress: this.erc721Bid.address,
            bidAssetAmount: 1,
            bidAssetData: erc721BidTokenIdData,
            feeAmount: 0
          },
          { from: user1 }
        )
      );

      await shouldFail.reverting(
        this.exchange.createOrder(
          {
            askAssetProxyId: ERC20_PROXY_ID,
            askAssetAddress: this.erc20Ask.address,
            askAssetAmount: erc20AskValue.toString(),
            askAssetData: "0x00",
            bidAssetProxyId: "0x12345678",
            bidAssetAddress: this.erc721Bid.address,
            bidAssetAmount: 1,
            bidAssetData: erc721BidTokenIdData,
            feeAmount: 0
          },
          { from: user1 }
        )
      );
    });

    it("when asset address is 0", async function() {
      await shouldFail.reverting(
        this.exchange.createOrder(
          {
            askAssetProxyId: ERC20_PROXY_ID,
            askAssetAddress: ZERO_ADDRESS,
            askAssetAmount: erc20AskValue.toString(),
            askAssetData: "0x00",
            bidAssetProxyId: ERC721_PROXY_ID,
            bidAssetAddress: this.erc721Bid.address,
            bidAssetAmount: 1,
            bidAssetData: erc721BidTokenIdData,
            feeAmount: 0
          },
          { from: user1 }
        )
      );

      await shouldFail.reverting(
        this.exchange.createOrder(
          {
            askAssetProxyId: ERC20_PROXY_ID,
            askAssetAddress: this.erc20Ask.address,
            askAssetAmount: erc20AskValue.toString(),
            askAssetData: "0x00",
            bidAssetProxyId: ERC721_PROXY_ID,
            bidAssetAddress: ZERO_ADDRESS,
            bidAssetAmount: 1,
            bidAssetData: erc721BidTokenIdData,
            feeAmount: 0
          },
          { from: user1 }
        )
      );
    });

    it("when asset amount is 0", async function() {
      await shouldFail.reverting(
        this.exchange.createOrder(
          {
            askAssetProxyId: ERC20_PROXY_ID,
            askAssetAddress: this.erc20Ask.address,
            askAssetAmount: 0,
            askAssetData: "0x00",
            bidAssetProxyId: ERC721_PROXY_ID,
            bidAssetAddress: this.erc721Bid.address,
            bidAssetAmount: 1,
            bidAssetData: erc721BidTokenIdData,
            feeAmount: 0
          },
          { from: user1 }
        )
      );

      await shouldFail.reverting(
        this.exchange.createOrder(
          {
            askAssetProxyId: ERC20_PROXY_ID,
            askAssetAddress: this.erc20Ask.address,
            askAssetAmount: erc20AskValue.toString(),
            askAssetData: "0x00",
            bidAssetProxyId: ERC721_PROXY_ID,
            bidAssetAddress: this.erc721Bid.address,
            bidAssetAmount: 0,
            bidAssetData: erc721BidTokenIdData,
            feeAmount: 0
          },
          { from: user1 }
        )
      );
    });

    it("when asset amount exceedes limit", async function() {
      await shouldFail.reverting(
        this.exchange.createOrder(
          {
            askAssetProxyId: ERC20_PROXY_ID,
            askAssetAddress: this.erc20Ask.address,
            askAssetAmount: LIMIT.add(new BN("1")).toString(),
            askAssetData: "0x00",
            bidAssetProxyId: ERC721_PROXY_ID,
            bidAssetAddress: this.erc721Bid.address,
            bidAssetAmount: 1,
            bidAssetData: erc721BidTokenIdData,
            feeAmount: 0
          },
          { from: user1 }
        )
      );

      await shouldFail.reverting(
        this.exchange.createOrder(
          {
            askAssetProxyId: ERC20_PROXY_ID,
            askAssetAddress: this.erc20Ask.address,
            askAssetAmount: erc20AskValue.toString(),
            askAssetData: "0x00",
            bidAssetProxyId: ERC721_PROXY_ID,
            bidAssetAddress: this.erc721Bid.address,
            bidAssetAmount: LIMIT.add(new BN("1")).toString(),
            bidAssetData: erc721BidTokenIdData,
            feeAmount: 0
          },
          { from: user1 }
        )
      );
    });

    it("when asset is not transferable", async function() {
      await this.erc20Ask.approve(this.erc20Proxy.address, 0, { from: user1 });

      await shouldFail.reverting(
        this.exchange.createOrder(
          {
            askAssetProxyId: ERC20_PROXY_ID,
            askAssetAddress: this.erc20Ask.address,
            askAssetAmount: erc20AskValue.toString(),
            askAssetData: "0x00",
            bidAssetProxyId: ERC721_PROXY_ID,
            bidAssetAddress: this.erc721Bid.address,
            bidAssetAmount: 1,
            bidAssetData: erc721BidTokenIdData,
            feeAmount: 0
          },
          { from: user1 }
        )
      );
    });
  });
});
