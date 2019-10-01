pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

interface IMarketPairRegistry {
    /**
    * address ask Ask Token is token to take, get
    * address bid Bid token is token to give, pay
    */
    struct MarketPair {
        address ask;
        address bid;
    }

    function getAllMarkets() external view returns (MarketPair[] memory);
    function getBidsOfAsk(address ask) external view returns (address[] memory);
    function getAsksOfBid(address bid) external view returns (address[] memory);
}
