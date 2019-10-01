pragma solidity ^0.5.3;

/**
 * @title AssetProxy
 */
interface IAssetProxy {
    /**
     * @dev get ID of current proxy
     * @return proxy ID
     */
    function proxyId() external pure returns (bytes4);

    /**
     * @dev Check an asset is transferable
     * @param from The address of asset holder
     * @param amount Desired amount of asset to be transferred
     * @param assetAddress The address of the asset
     * @param assetData Extra asset data
     * @return true if asset is transferable
     */
    function canTransferFrom(
        address from,
        uint256 amount,
        address assetAddress,
        bytes calldata assetData
    ) external view returns (bool);

    /**
     * @dev Transfer asset from address to address
     * @param from The address of asset holder
     * @param to The address of asset taker
     * @param amount The amount of assets
     * @param assetAddress The address of the asset
     * @param assetData Extra asset data
     */
    function transferFrom(
        address from,
        address to,
        uint256 amount,
        address assetAddress,
        bytes calldata assetData
    ) external;
}
