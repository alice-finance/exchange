const ERC20Proxy = artifacts.require("./proxy/ERC20Proxy.sol");
const ERC721Proxy = artifacts.require("./proxy/ERC721Proxy.sol");
const ERC20 = artifacts.require("./mock/ERC20Mock.sol");
const ERC721 = artifacts.require("./mock/ERC721Mock.sol");

const { BN, constants, shouldFail } = require("openzeppelin-test-helpers");
const { expect } = require("chai");
const { ZERO_ADDRESS } = constants;

contract("AssetProxy", function([admin, user1, user2]) {
  const ERC20_PROXY_ID = "0xcc4aa204";
  const ERC721_PROXY_ID = "0x9013e617";
  const erc20Value = new BN("100");
  const erc721TokenId1 = new BN("1");
  const erc721TokenIdData1 = "0x" + erc721TokenId1.toString(16, 64);
  const erc721TokenIdData1WithExtra = erc721TokenIdData1 + "0123456789abcdef".repeat(16);

  beforeEach(async function() {
    this.erc20 = await ERC20.new("ERC20", "E20", 18, { from: admin });
    this.erc721 = await ERC721.new("ERC721", "E721", { from: admin });
  });

  describe("ERC20Proxy", function() {
    beforeEach(async function() {
      this.proxy = await ERC20Proxy.new({ from: admin });
    });

    it("proxyId", async function() {
      expect(await this.proxy.proxyId()).to.be.equal(ERC20_PROXY_ID);
    });

    describe("with proxy", function() {
      beforeEach(async function() {
        await this.erc20.mint(user1, erc20Value, { from: admin });
      });

      context("canTransferFrom", function() {
        it("should return true if allowance is greater or equal than amount", async function() {
          await this.erc20.approve(this.proxy.address, erc20Value.mul(new BN("2")), { from: user1 });
          expect(await this.proxy.canTransferFrom(user1, erc20Value, this.erc20.address, "0x00")).to.be.true;
        });

        it("should return false when allowance is less than amount", async function() {
          await this.erc20.approve(this.proxy.address, erc20Value.div(new BN("2")), { from: user1 });
          expect(await this.proxy.canTransferFrom(user1, erc20Value, this.erc20.address, "0x00")).to.be.false;
        });
      });

      context("transferFrom", function() {
        it("should transfer", async function() {
          await this.erc20.approve(this.proxy.address, erc20Value, { from: user1 });

          expect(await this.erc20.balanceOf(user1)).to.be.bignumber.equal(erc20Value);
          expect(await this.erc20.balanceOf(user2)).to.be.bignumber.equal(new BN("0"));

          await this.proxy.transferFrom(user1, user2, erc20Value, this.erc20.address, "0x00");

          expect(await this.erc20.balanceOf(user1)).to.be.bignumber.equal(new BN("0"));
          expect(await this.erc20.balanceOf(user2)).to.be.bignumber.equal(erc20Value);
        });

        it("should not transfer if allowance is not bigger than amount", async function() {
          await this.erc20.approve(this.proxy.address, erc20Value.div(new BN("2")), { from: user1 });

          await shouldFail.reverting(this.proxy.transferFrom(user1, user2, erc20Value, this.erc20.address, "0x00"));
        });

        it("should not transfer if receiver is ZERO_ADDRESS", async function() {
          await this.erc20.approve(this.proxy.address, erc20Value, { from: user1 });

          await shouldFail.reverting(
            this.proxy.transferFrom(user1, ZERO_ADDRESS, erc20Value, this.erc20.address, "0x00")
          );
        });
      });
    });
  });

  describe("ERC721Proxy", function() {
    beforeEach(async function() {
      this.proxy = await ERC721Proxy.new({ from: admin });
    });

    it("proxyId", async function() {
      expect(await this.proxy.proxyId()).to.be.equal(ERC721_PROXY_ID);
    });

    describe("with proxy", function() {
      beforeEach(async function() {
        await this.erc721.mint(user1, erc721TokenId1, { from: admin });
      });

      context("canTransferFrom", function() {
        it("should return true if token is approved to proxy", async function() {
          await this.erc721.approve(this.proxy.address, erc721TokenId1, { from: user1 });
          expect(await this.proxy.canTransferFrom(user1, 0, this.erc721.address, erc721TokenIdData1)).to.be.true;
        });

        it("should return false if token is not approved to proxy", async function() {
          expect(await this.proxy.canTransferFrom(user1, 0, this.erc721.address, erc721TokenIdData1)).to.be.false;
        });
      });

      context("transferFrom", function() {
        it("should transfer", async function() {
          await this.erc721.approve(this.proxy.address, erc721TokenId1, { from: user1 });

          expect(await this.erc721.ownerOf(erc721TokenId1)).to.be.equal(user1);

          await this.proxy.transferFrom(user1, user2, 0, this.erc721.address, erc721TokenIdData1);

          expect(await this.erc721.ownerOf(erc721TokenId1)).to.be.equal(user2);

          await this.erc721.approve(this.proxy.address, erc721TokenId1, { from: user2 });

          await this.proxy.transferFrom(user2, user1, 0, this.erc721.address, erc721TokenIdData1WithExtra);

          expect(await this.erc721.ownerOf(erc721TokenId1)).to.be.equal(user1);
        });

        it("should not transfer if token is not approved to proxy", async function() {
          await shouldFail.reverting(this.proxy.transferFrom(user1, user2, 0, this.erc721.address, erc721TokenIdData1));
        });

        it("should not transfer if receiver is ZERO_ADDRESS", async function() {
          await this.erc721.approve(this.proxy.address, erc721TokenId1, { from: user1 });

          await shouldFail.reverting(
            this.proxy.transferFrom(user1, ZERO_ADDRESS, 0, this.erc721.address, erc721TokenIdData1)
          );
        });
      });
    });
  });
});
