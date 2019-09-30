const Exchange = artifacts.require("./exchange/Exchange.sol");
const ERC20Proxy = artifacts.require("./proxy/ERC20Proxy.sol");
const ERC721Proxy = artifacts.require("./proxy/ERC721Proxy.sol");
const ERC20 = artifacts.require("./mock/ERC20Mock.sol");
const ERC721 = artifacts.require("./mock/ERC721Mock.sol");

const { BN, constants, expectEvent, shouldFail } = require("openzeppelin-test-helpers");
const { expect } = require("chai");
const { ZERO_ADDRESS } = constants;

contract("Exchange.fillOrder", function([admin, owner, user1, user2, user3]) {
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

  describe("fill order", function() {
    it("should fill erc20 to erc20", async function() {
      await this.erc20Ask.approve(this.erc20Proxy.address, erc20AskValue, { from: user1 });
      await this.erc20Bid.approve(this.erc20Proxy.address, erc20BidValue, { from: user2 });

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
        { from: user1 }
      );

      let order = await this.exchange.getOrder(this.erc20Ask.address, this.erc20Bid.address, new BN("0"));
      expect(order.nonce).to.be.equal("0");

      const { logs } = await this.exchange.fillOrder(
        {
          askAssetAddress: this.erc20Ask.address,
          bidAssetAddress: this.erc20Bid.address,
          nonce: 0,
          bidAssetAmountToFill: erc20BidValue.toString(),
          feeAmount: 0
        },
        { from: user2 }
      );

      expectEvent.inLogs(logs, "OrderFilled", { status: new BN("2") });

      expect(await this.erc20Ask.balanceOf(user2)).to.be.bignumber.equal(erc20AskValue);
      expect(await this.erc20Bid.balanceOf(user1)).to.be.bignumber.equal(erc20BidValue);
    });

    it("should fill erc20 to erc721", async function() {
      await this.erc20Ask.approve(this.erc20Proxy.address, erc20AskValue, { from: user1 });
      await this.erc721Bid.approve(this.erc721Proxy.address, erc721BidTokenId, { from: user2 });

      await this.exchange.createOrder(
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

      let order = await this.exchange.getOrder(this.erc20Ask.address, this.erc721Bid.address, new BN("0"));
      expect(order.nonce).to.be.equal("0");

      const { logs } = await this.exchange.fillOrder(
        {
          askAssetAddress: this.erc20Ask.address,
          bidAssetAddress: this.erc721Bid.address,
          nonce: 0,
          bidAssetAmountToFill: 1,
          feeAmount: 0
        },
        { from: user2 }
      );

      expectEvent.inLogs(logs, "OrderFilled", { status: new BN("2") });

      expect(await this.erc20Ask.balanceOf(user2)).to.be.bignumber.equal(erc20AskValue);
      expect(await this.erc721Bid.ownerOf(erc721BidTokenId)).to.be.equal(user1);
    });

    it("should fill erc721 to erc20", async function() {
      await this.erc721Ask.approve(this.erc721Proxy.address, erc721AskTokenId, { from: user1 });
      await this.erc20Bid.approve(this.erc20Proxy.address, erc20BidValue, { from: user2 });

      await this.exchange.createOrder(
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

      let order = await this.exchange.getOrder(this.erc721Ask.address, this.erc20Bid.address, new BN("0"));
      expect(order.nonce).to.be.equal("0");

      const { logs } = await this.exchange.fillOrder(
        {
          askAssetAddress: this.erc721Ask.address,
          bidAssetAddress: this.erc20Bid.address,
          nonce: 0,
          bidAssetAmountToFill: erc20BidValue.toString(),
          feeAmount: 0
        },
        { from: user2 }
      );

      expectEvent.inLogs(logs, "OrderFilled", { status: new BN("2") });

      expect(await this.erc721Ask.ownerOf(erc721AskTokenId)).to.be.equal(user2);
      expect(await this.erc20Bid.balanceOf(user1)).to.be.bignumber.equal(erc20BidValue);
    });

    it("should fill erc721 to erc721", async function() {
      await this.erc721Ask.approve(this.erc721Proxy.address, erc721AskTokenId, { from: user1 });
      await this.erc721Bid.approve(this.erc721Proxy.address, erc721BidTokenId, { from: user2 });

      await this.exchange.createOrder(
        {
          askAssetProxyId: ERC721_PROXY_ID,
          askAssetAddress: this.erc721Ask.address,
          askAssetAmount: 1,
          askAssetData: erc721AskTokenIdData,
          bidAssetProxyId: ERC721_PROXY_ID,
          bidAssetAddress: this.erc721Bid.address,
          bidAssetAmount: 1,
          bidAssetData: erc721BidTokenIdData,
          feeAmount: 0
        },
        { from: user1 }
      );

      let order = await this.exchange.getOrder(this.erc721Ask.address, this.erc721Bid.address, new BN("0"));
      expect(order.nonce).to.be.equal("0");

      const { logs } = await this.exchange.fillOrder(
        {
          askAssetAddress: this.erc721Ask.address,
          bidAssetAddress: this.erc721Bid.address,
          nonce: 0,
          bidAssetAmountToFill: 1,
          feeAmount: 0
        },
        { from: user2 }
      );

      expectEvent.inLogs(logs, "OrderFilled", { status: new BN("2") });

      expect(await this.erc721Ask.ownerOf(erc721AskTokenId)).to.be.equal(user2);
      expect(await this.erc721Bid.ownerOf(erc721BidTokenId)).to.be.equal(user1);
    });

    context("should revert", function() {
      beforeEach(async function() {
        await this.erc20Ask.approve(this.erc20Proxy.address, erc20AskValue, { from: user1 });
        await this.erc20Bid.approve(this.erc20Proxy.address, erc20BidValue, { from: user2 });

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
          { from: user1 }
        );
      });

      it("when given address is ZERO", async function() {
        await shouldFail.reverting(
          this.exchange.fillOrder(
            {
              askAssetAddress: ZERO_ADDRESS,
              bidAssetAddress: this.erc20Bid.address,
              nonce: 0,
              bidAssetAmountToFill: erc20BidValue.toString(),
              feeAmount: 0
            },
            { from: user2 }
          )
        );

        await shouldFail.reverting(
          this.exchange.fillOrder(
            {
              askAssetAddress: this.erc20Ask.address,
              bidAssetAddress: ZERO_ADDRESS,
              nonce: 0,
              bidAssetAmountToFill: erc20BidValue.toString(),
              feeAmount: 0
            },
            { from: user2 }
          )
        );
      });

      it("when order is not exists", async function() {
        await shouldFail.reverting(
          this.exchange.fillOrder(
            {
              askAssetAddress: this.erc20Ask.address,
              bidAssetAddress: this.erc20Bid.address,
              nonce: 1,
              bidAssetAmountToFill: erc20BidValue.toString(),
              feeAmount: 0
            },
            { from: user2 }
          )
        );
      });

      it("when order is not fillable - already filled", async function() {
        await this.exchange.fillOrder(
          {
            askAssetAddress: this.erc20Ask.address,
            bidAssetAddress: this.erc20Bid.address,
            nonce: 0,
            bidAssetAmountToFill: erc20BidValue.toString(),
            feeAmount: 0
          },
          { from: user2 }
        );

        let order = await this.exchange.getOrder(this.erc20Ask.address, this.erc20Bid.address, new BN("0"));
        expect(order.status).to.be.equal("2");

        await shouldFail.reverting(
          this.exchange.fillOrder(
            {
              askAssetAddress: this.erc20Ask.address,
              bidAssetAddress: this.erc20Bid.address,
              nonce: 0,
              bidAssetAmountToFill: erc20BidValue.toString(),
              feeAmount: 0
            },
            { from: user2 }
          )
        );
      });

      it("when order is not fillable - cancelled", async function() {
        await this.exchange.cancelOrder(
          {
            askAssetAddress: this.erc20Ask.address,
            bidAssetAddress: this.erc20Bid.address,
            nonce: 0
          },
          { from: user1 }
        );

        let order = await this.exchange.getOrder(this.erc20Ask.address, this.erc20Bid.address, new BN("0"));
        expect(order.status).to.be.equal("3");

        await shouldFail.reverting(
          this.exchange.fillOrder(
            {
              askAssetAddress: this.erc20Ask.address,
              bidAssetAddress: this.erc20Bid.address,
              nonce: 0,
              bidAssetAmountToFill: erc20BidValue.toString(),
              feeAmount: 0
            },
            { from: user2 }
          )
        );
      });

      it("when bid fill amount is 0", async function() {
        await shouldFail.reverting(
          this.exchange.fillOrder(
            {
              askAssetAddress: this.erc20Ask.address,
              bidAssetAddress: this.erc20Bid.address,
              nonce: 0,
              bidAssetAmountToFill: 0,
              feeAmount: 0
            },
            { from: user2 }
          )
        );
      });

      it("when bid fill amount exceeded LIMIT", async function() {
        await shouldFail.reverting(
          this.exchange.fillOrder(
            {
              askAssetAddress: this.erc20Ask.address,
              bidAssetAddress: this.erc20Bid.address,
              nonce: 0,
              bidAssetAmountToFill: LIMIT.add(new BN("1")).toString(),
              feeAmount: 0
            },
            { from: user2 }
          )
        );
      });
    });
  });

  context("partially filled orders", function() {
    beforeEach(async function() {
      await this.erc20Ask.approve(this.erc20Proxy.address, erc20AskValue, { from: user1 });
      await this.erc20Bid.approve(this.erc20Proxy.address, erc20BidValue, { from: user2 });

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
        { from: user1 }
      );
    });

    it("should fill only remaining amount", async function() {
      await this.exchange.fillOrder(
        {
          askAssetAddress: this.erc20Ask.address,
          bidAssetAddress: this.erc20Bid.address,
          nonce: 0,
          bidAssetAmountToFill: erc20BidValue.div(new BN("2")).toString(),
          feeAmount: 0
        },
        { from: user2 }
      );

      let order = await this.exchange.getOrder(this.erc20Ask.address, this.erc20Bid.address, new BN("0"));
      expect(order.status).to.be.equal("1");

      let remaining = new BN(order.bidAssetAmount).sub(new BN(order.bidAssetFilledAmount));

      await this.erc20Bid.mint(user3, erc20BidValue, { from: admin });
      await this.erc20Bid.approve(this.erc20Proxy.address, erc20BidValue, { from: user3 });

      await this.exchange.fillOrder(
        {
          askAssetAddress: this.erc20Ask.address,
          bidAssetAddress: this.erc20Bid.address,
          nonce: 0,
          bidAssetAmountToFill: erc20BidValue.toString(),
          feeAmount: 0
        },
        { from: user3 }
      );

      order = await this.exchange.getOrder(this.erc20Ask.address, this.erc20Bid.address, new BN("0"));
      expect(order.status).to.be.equal("2");

      expect(await this.erc20Bid.balanceOf(user3)).to.be.bignumber.equal(erc20BidValue.sub(remaining));
    });

    it("should revert when fill amount is not enough to take ask asset", async function() {
      let order = await this.exchange.getOrder(this.erc20Ask.address, this.erc20Bid.address, new BN("0"));
      expect(order.status).to.be.equal("1");

      await shouldFail.reverting(
        this.exchange.fillOrder(
          {
            askAssetAddress: this.erc20Ask.address,
            bidAssetAddress: this.erc20Bid.address,
            nonce: 0,
            bidAssetAmountToFill: new BN("1").toString(),
            feeAmount: 0
          },
          { from: user2 }
        )
      );

      order = await this.exchange.getOrder(this.erc20Ask.address, this.erc20Bid.address, new BN("0"));
      expect(order.status).to.be.equal("1");
    });

    it("should set status filled if next fill cannot take asset anymore", async function() {
      let order = await this.exchange.getOrder(this.erc20Ask.address, this.erc20Bid.address, new BN("0"));
      expect(order.status).to.be.equal("1");

      await this.exchange.fillOrder(
        {
          askAssetAddress: this.erc20Ask.address,
          bidAssetAddress: this.erc20Bid.address,
          nonce: 0,
          bidAssetAmountToFill: erc20BidValue.sub(new BN("1")).toString(),
          feeAmount: 0
        },
        { from: user2 }
      );

      order = await this.exchange.getOrder(this.erc20Ask.address, this.erc20Bid.address, new BN("0"));
      expect(order.status).to.be.equal("2");
    });
  });

  context("fill and create order", function() {
    let overfillAmount = erc20BidValue.div(new BN("3"));
    let overfillValue = erc20BidValue.add(overfillAmount);

    beforeEach(async function() {
      await this.erc20Bid.mint(user2, overfillValue, { from: admin });
      await this.erc20Ask.approve(this.erc20Proxy.address, erc20AskValue, { from: user1 });
      await this.erc20Bid.approve(this.erc20Proxy.address, overfillValue, { from: user2 });

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
        { from: user1 }
      );
    });

    it("should create new order", async function() {
      const expectedNewAskAssetAmount = overfillAmount;
      const expectedNewBidAssetAmount = expectedNewAskAssetAmount.mul(erc20AskValue).div(erc20BidValue);

      const { logs } = await this.exchange.fillAndCreateOrder(
        {
          askAssetAddress: this.erc20Ask.address,
          bidAssetAddress: this.erc20Bid.address,
          nonce: 0,
          bidAssetAmountToFill: overfillValue.toString(),
          feeAmount: 0
        },
        { from: user2 }
      );

      expectEvent.inLogs(logs, "OrderFilled", { status: new BN("2") });
      expectEvent.inLogs(logs, "OrderCreated", {
        askAssetAddress: this.erc20Bid.address,
        askAssetAmount: expectedNewAskAssetAmount,
        bidAssetAddress: this.erc20Ask.address,
        bidAssetAmount: expectedNewBidAssetAmount
      });
    });
  });
});
