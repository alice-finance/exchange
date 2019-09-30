const Exchange = artifacts.require("./exchange/Exchange.sol");
const ERC20Proxy = artifacts.require("./proxy/ERC20Proxy.sol");
const ERC721Proxy = artifacts.require("./proxy/ERC721Proxy.sol");
const ERC20 = artifacts.require("./mock/ERC20Mock.sol");
const ERC721 = artifacts.require("./mock/ERC721Mock.sol");

const { BN, expectEvent, shouldFail } = require("openzeppelin-test-helpers");
const { expect } = require("chai");

contract("Exchange.cancelOrder", function([admin, owner, user1, user2]) {
  const ERC20_PROXY_ID = "0xcc4aa204";
  const ERC721_PROXY_ID = "0x9013e617";
  const erc20AskValue = new BN("10000");
  const erc20BidValue = new BN("20000");
  const erc721AskTokenId = new BN("1");
  const erc721BidTokenId = new BN("2");

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

  describe("cancel order", function() {
    beforeEach(async function() {
      await this.erc20Ask.approve(this.erc20Proxy.address, erc20AskValue, { from: user1 });

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

    context("should cancel", function() {
      it("not filled order", async function() {
        let { logs } = await this.exchange.cancelOrder(
          {
            askAssetAddress: this.erc20Ask.address,
            bidAssetAddress: this.erc20Bid.address,
            nonce: 0
          },
          { from: user1 }
        );

        expectEvent.inLogs(logs, "OrderCancelled", {
          askAssetAddress: this.erc20Ask.address,
          bidAssetAddress: this.erc20Bid.address,
          nonce: new BN("0")
        });
      });

      it("partially filled order", async function() {
        await this.erc20Bid.approve(this.erc20Proxy.address, erc20BidValue, { from: user2 });
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

        let { logs } = await this.exchange.cancelOrder(
          {
            askAssetAddress: this.erc20Ask.address,
            bidAssetAddress: this.erc20Bid.address,
            nonce: 0
          },
          { from: user1 }
        );

        expectEvent.inLogs(logs, "OrderCancelled", {
          askAssetAddress: this.erc20Ask.address,
          bidAssetAddress: this.erc20Bid.address,
          nonce: new BN("0")
        });
      });
    });

    context("should revert", function() {
      it("when maker is not caller", async function() {
        await shouldFail.reverting(
          this.exchange.cancelOrder(
            {
              askAssetAddress: this.erc20Ask.address,
              bidAssetAddress: this.erc20Bid.address,
              nonce: 0
            },
            { from: user2 }
          )
        );
      });

      it("when order is already cancelled", async function() {
        await this.exchange.cancelOrder(
          {
            askAssetAddress: this.erc20Ask.address,
            bidAssetAddress: this.erc20Bid.address,
            nonce: 0
          },
          { from: user1 }
        );

        await shouldFail.reverting(
          this.exchange.cancelOrder(
            {
              askAssetAddress: this.erc20Ask.address,
              bidAssetAddress: this.erc20Bid.address,
              nonce: 0
            },
            { from: user1 }
          )
        );
      });

      it("when order is already filled", async function() {
        await this.erc20Bid.approve(this.erc20Proxy.address, erc20BidValue, { from: user2 });
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

        let order = await this.exchange.getOrder(this.erc20Ask.address, this.erc20Bid.address, 0);
        expect(order.status).to.be.equal("2");

        await shouldFail.reverting(
          this.exchange.cancelOrder(
            {
              askAssetAddress: this.erc20Ask.address,
              bidAssetAddress: this.erc20Bid.address,
              nonce: 0
            },
            { from: user1 }
          )
        );
      });
    });
  });
});
