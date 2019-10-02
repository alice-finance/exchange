pragma solidity ^0.5.11;

import "@openzeppelin/upgrades/contracts/Initializable.sol";

import "../proxy/IAssetProxy.sol";

/**
 * @title AssetProxyRegistry
 */
contract AssetProxyRegistry is Initializable {
    // registered asset proxies
    mapping(bytes4 => IAssetProxy) internal _assetProxyOfProxyId;

    event AssetProxyRegistered(bytes4 proxyId, IAssetProxy assetProxy);

    /**
     * @dev register AssetProxy of given proxy ID
     * @param proxyId The proxy ID
     * @param assetProxy The asset proxy to be registered
     */
    function registerAssetProxy(bytes4 proxyId, IAssetProxy assetProxy) public {
        require(proxyId != 0, "proxyId is 0");
        require(
            address(_assetProxyOfProxyId[proxyId]) == address(0),
            "assetProxy of same proxyId already registered"
        );

        _assetProxyOfProxyId[proxyId] = assetProxy;

        emit AssetProxyRegistered(proxyId, assetProxy);
    }

    /**
     * @dev get AssetProxy of given proxy ID
     * @param proxyId The proxy ID
     * @return AssetProxy of given proxy ID
     */
    function assetProxyOf(bytes4 proxyId) public view returns (IAssetProxy) {
        return _assetProxyOfProxyId[proxyId];
    }

    // Reserved storage space to allow for layout changes in the future.
    uint256[50] private ______gap;
}
