pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import "../ownership/Ownable.sol";

contract MarketPairRegistry is Ownable {
    struct MarketPair {
        address ask;
        address bid;
    }

    MarketPair[] _marketPair;

    mapping(address => mapping(address => bool)) _askBidRegistered;
    mapping(address => mapping(address => bool)) _bidAskRegistered;
    mapping(address => address[]) _bidsOfAsk;
    mapping(address => address[]) _asksOfBid;

    function getAllMarkets() public view returns (MarketPair[] memory) {
        return _marketPair;
    }

    function getBidsOfAsk(address ask) public view returns (address[] memory) {
        return _bidsOfAsk[ask];
    }

    function getAsksOfBid(address bid) public view returns (address[] memory) {
        return _asksOfBid[bid];
    }

    function isRegistered(address ask, address bid) public view returns (bool) {
        return
            _askBidRegistered[ask][bid] == true &&
            _bidAskRegistered[bid][ask] == true;
    }

    function registerMarket(address ask, address bid)
        public
        onlyOwner
        returns (bool)
    {
        require(!isRegistered(ask, bid), "already registered");

        uint256 marketId = _marketPair.length;
        _marketPair.length += 1;
        _marketPair[marketId].ask = ask;
        _marketPair[marketId].bid = bid;

        _askBidRegistered[ask][bid] = true;
        _bidAskRegistered[bid][ask] = true;

        _bidsOfAsk[ask].push(bid);
        _asksOfBid[bid].push(ask);

        return true;
    }

    function removeMarket(address ask, address bid)
        public
        onlyOwner
        returns (bool)
    {
        require(isRegistered(ask, bid), "not registered");

        _askBidRegistered[ask][bid] = false;
        _bidAskRegistered[bid][ask] = false;

        for (uint256 i = 0; i < _bidsOfAsk[ask].length; i++) {
            if (_bidsOfAsk[ask][i] == bid) {
                // prettier-ignore
                _bidsOfAsk[ask][i] = _bidsOfAsk[ask][_bidsOfAsk[ask].length - 1];
                _bidsOfAsk[ask].length -= 1;
                break;
            }
        }

        for (uint256 i = 0; i < _asksOfBid[bid].length; i++) {
            if (_asksOfBid[bid][i] == ask) {
                // prettier-ignore
                _asksOfBid[bid][i] = _asksOfBid[bid][_asksOfBid[bid].length - 1];
                _asksOfBid[bid].length -= 1;
                break;
            }
        }

        return true;
    }
}
