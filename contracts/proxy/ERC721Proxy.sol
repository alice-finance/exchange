pragma solidity ^0.5.3;

import "openzeppelin-solidity/contracts/token/ERC721/IERC721.sol";

import "./AssetProxy.sol";

/**
 * @title ERC721Proxy
 * @dev AssetProxy of ERC721 tokens
 */
contract ERC721Proxy is AssetProxy {
    /// @dev ID of ERC721 Proxy
    bytes4 internal constant PROXY_ID = bytes4(keccak256("ERC721(uint256)"));

    /**
     * @dev get ID of current proxy
     * @return proxy ID
     */
    function proxyId() public pure returns (bytes4) {
        return PROXY_ID;
    }

    /**
     * @dev Check an asset is transferable
     * @param assetAddress The address of the asset
     * @param assetData Extra asset data
     * @return true if asset is transferable
     */
    function canTransferFrom(
        address, // from is not used
        uint256, // amount is not used
        address assetAddress,
        bytes memory assetData
    ) public view returns (bool) {
        uint256 tokenId = _decodeTokenId(assetData);
        IERC721 erc721 = IERC721(assetAddress);
        return erc721.getApproved(tokenId) == address(this);
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
        require(
            canTransferFrom(from, amount, assetAddress, assetData),
            "cannot transfer from"
        );

        uint256 tokenId = _decodeTokenId(assetData);
        bytes memory data = _decodeData(assetData);

        IERC721 erc721 = IERC721(assetAddress);
        erc721.safeTransferFrom(from, to, tokenId, data);
    }

    /**
     * @dev decode assetData and get token ID
     * @param assetData Extra asset data
     * @return decoded token ID
     */
    function _decodeTokenId(bytes memory assetData)
        private
        pure
        returns (uint256 tokenId)
    {
        assembly {
            tokenId := mload(add(assetData, 0x20))
        }
    }

    /**
     * @dev decode assetData and get data in it
     * @param assetData extra asset data
     * @return decoded data
     */
    function _decodeData(bytes memory assetData)
        private
        pure
        returns (bytes memory)
    {
        uint256 dataLength = assetData.length - 0x20;
        bytes memory data = new bytes(dataLength);
        _memcpy(data, 0, assetData, 0x20, dataLength);
        return data;
    }

    /**
     * @dev perform memcpy
     */
    function _memcpy(
        bytes memory dst,
        uint256 dstOffset,
        bytes memory src,
        uint256 srcOffset,
        uint256 len
    ) private pure {
        uint256 d;
        uint256 s;
        assembly {
            d := dst
            s := src
        }

        // Copy word-length chunks while possible
        for (; len >= 32; len -= 32) {
            assembly {
                mstore(
                    add(add(dst, 0x20), dstOffset),
                    mload(add(add(src, 0x20), srcOffset))
                )
            }
            d += 32;
            s += 32;
        }

        // Copy remaining bytes
        uint256 mask = 256**(32 - len) - 1;
        assembly {
            let srcpart := and(mload(add(add(src, 0x20), srcOffset)), not(mask))
            let dstpart := and(mload(add(add(dst, 0x20), dstOffset)), mask)
            mstore(add(add(dst, 0x20), dstOffset), or(dstpart, srcpart))
        }
    }

    // Reserved storage space to allow for layout changes in the future.
    uint256[50] private ______gap;
}
