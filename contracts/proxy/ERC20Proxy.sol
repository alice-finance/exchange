pragma solidity ^0.5.3;

import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";

import "./AssetProxy.sol";


/**
 * @title ERC20Proxy
 * @dev AssetProxy of ERC20 tokens
 */
contract ERC20Proxy is AssetProxy {
    /// @dev ID of ERC20 Proxy
    bytes4 constant internal PROXY_ID = bytes4(keccak256("ERC20()"));

    /**
     * @dev get ID of current proxy
     * @return proxy ID
     */
    function proxyId() public pure returns (bytes4) {
        return PROXY_ID;
    }

    /**
     * @dev Check an asset is transferable
     * @param from The address of asset holder
     * @param amount Desired amount of asset to be transferred
     * @param assetAddress The address of the asset
     * @return true if asset is transferable
     */
    function canTransferFrom(
        address from,
        uint256 amount,
        address assetAddress,
        bytes memory // assetData is not used
    ) public view returns (bool) {
        IERC20 erc20 = IERC20(assetAddress);
        return erc20.allowance(from, address(this)) >= amount;
    }

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
        bytes memory assetData
    ) public {
        require(canTransferFrom(from, amount, assetAddress, assetData), "cannot transfer from");

        IERC20 erc20 = IERC20(assetAddress);
        require(erc20.transferFrom(from, to, amount));
    }

    // Reserved storage space to allow for layout changes in the future.
    uint256[50] private ______gap;
}
