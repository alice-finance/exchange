const AssetProxyRegistry = artifacts.require("./proxy/AssetProxyRegistry.sol");
const ERC20Proxy = artifacts.require("./proxy/ERC20Proxy.sol");
const ERC721Proxy = artifacts.require("./proxy/ERC721Proxy.sol");

const { shouldFail } = require("openzeppelin-test-helpers");

contract("AssetProxyRegistry", function ([admin, owner]) {
  const ERC20_PROXY_ID = "0xcc4aa204";
  const ERC721_PROXY_ID = "0x9013e617";

  beforeEach(async function () {
    this.registry = await AssetProxyRegistry.new({ from: admin });
    this.erc20Proxy = await ERC20Proxy.new({ from: admin });
    this.erc721Proxy = await ERC721Proxy.new({ from: admin });
  });

  describe("registerAssetProxy", function () {
    it("should register proxy", async function () {
      await this.registry.registerAssetProxy(ERC20_PROXY_ID, this.erc20Proxy.address, { from: owner });
      (await this.registry.assetProxyOf(ERC20_PROXY_ID)).should.be.equal(this.erc20Proxy.address);

      await this.registry.registerAssetProxy(ERC721_PROXY_ID, this.erc721Proxy.address, { from: owner });
      (await this.registry.assetProxyOf(ERC721_PROXY_ID)).should.be.equal(this.erc721Proxy.address);
    });

    it("should revert if proxyId is 0", async function () {
      await shouldFail.reverting(
        this.registry.registerAssetProxy("0x00", this.erc20Proxy.address, { from: owner })
      );
    });

    it("should revert if assetProxy is already registered", async function () {
      const erc20Proxy2 = await ERC20Proxy.new({ from: admin });

      await this.registry.registerAssetProxy(ERC20_PROXY_ID, this.erc20Proxy.address, { from: owner });
      (await this.registry.assetProxyOf(ERC20_PROXY_ID)).should.be.equal(this.erc20Proxy.address);

      await shouldFail.reverting(
        this.registry.registerAssetProxy(ERC20_PROXY_ID, erc20Proxy2.address, { from: owner })
      );
    });
  });
});
