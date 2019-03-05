pragma solidity ^0.5.3;
pragma experimental ABIEncoderV2;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";


/**
 * @title OrderBook
 */
contract OrderBook {
    using SafeMath for uint256;

    /// @dev MAX_AMOUNT is UINT128_MAX
    uint256 public constant MAX_AMOUNT = 2**128 - 1;

    uint256 public constant MIN_QUOTE_TIME = 60;

    enum OrderStatus {
        invalid, // Order is invalid
        fillable, // Order is fillable
        filled, // Order is fully filled
        cancelled // Order is cancelled
    }

    struct Order {
        uint256 nonce;  // nonce of order in specific market
        address maker;  // The address of order maker
        bytes4 askAssetProxyId; // The proxy ID of ask asset
        address askAssetAddress; // The address of ask asset
        uint256 askAssetAmount; // Ask amount
        bytes askAssetData; // Ask data
        bytes4 bidAssetProxyId; // The proxy ID of bid asset
        address bidAssetAddress; // The address of bid asset
        uint256 bidAssetAmount; // Bid amount
        bytes bidAssetData; // Bid data
        uint256 bidAssetFilledAmount; // Filled bid asset amount
        OrderStatus status; // OrderStatus
        uint256 timestamp; // timestamp
        bytes auxiliary; // reserved
    }

    struct OrderFill {
        uint256 orderNonce;
        address taker;
        bytes4 askAssetProxyId;
        address askAssetAddress;
        uint256 askAssetAmount;
        bytes askAssetData;
        bytes4 bidAssetProxyId;
        address bidAssetAddress;
        uint256 bidAssetAmount;
        bytes bidAssetData;
        uint256 bidAssetFilledAmount;
        OrderStatus status;
        uint256 timestamp;
        bytes auxiliary;
    }

    struct Price {
        uint256 ask;
        uint256 bid;
    }

    struct Quote {
        uint256 timeOpen;
        uint256 timeClose;
        Price open;
        Price high;
        Price low;
        Price close;
        uint256 volume;
    }

    /// @dev mapping bidAssetAddress => askAssetAddress => Order[]
    mapping(address => mapping(address => Order[])) internal _orders;

    /// @dev mapping bidAssetAddress => askAssetAddress => Price
    mapping(address => mapping(address => Price)) internal _currentPrice;

    /// @dev mapping bidAssetAddress => askAssetAddress => Price[]
    mapping(address => mapping(address => Price[])) internal _prices;

    /// @dev mapping bidAssetAddress => askAssetAddress => OrderFill[]
    mapping(address => mapping(address => OrderFill[])) internal _orderFills;

    /// @dev mapping bidAssetAddress => askAssetAddress => timestamp => Quote
    mapping(address => mapping(address => mapping(uint256 => Quote))) internal _quotes;

    /**
     * @notice get order of given params
     */
    function getOrder(
        address askAssetAddress,
        address bidAssetAddress,
        uint256 nonce
    ) public view returns (Order memory) {
        return _orders[bidAssetAddress][askAssetAddress][nonce];
    }

    /**
     * @notice get all orders of given params
     */
    function getOrders(
        address askAssetAddress,
        address bidAssetAddress,
        OrderStatus orderStatus,
        address maker,
        uint256 timeFrom,
        uint256 timeTo
    ) public view returns (Order[] memory) {
        Order[] storage orders = _orders[bidAssetAddress][askAssetAddress];

        if (orders.length == 0) return new Order[](0);

        uint count = 0;
        uint endIndex = 0;
        uint startIndex = 0;

        (count, startIndex, endIndex) = _getOrdersRange(orders, orderStatus, maker, timeFrom, timeTo);

        Order[] memory results = new Order[](count);

        uint index = 0;
        for (uint i = startIndex; i < endIndex; i++) {
            Order storage order = orders[i];

            if (maker != address(0) && order.maker != maker) {
                continue;
            }

            if (orderStatus != OrderStatus.invalid && order.status != orderStatus) {
                continue;
            }

            results[index] = orders[i];
            index = index.add(1);
        }

        return results;
    }

    /**
     * @notice get range of orders
     */ // solhint-disable-next-line code-complexity
    function _getOrdersRange(
        Order[] storage orders,
        OrderStatus orderStatus,
        address maker,
        uint256 timeFrom,
        uint256 timeTo
    ) internal view returns (uint256, uint256, uint256) {
        uint count = 0;
        uint startIndex = uint256(-1);
        uint endIndex = 0;

        for (uint i = 0; i < orders.length; i++) {
            Order storage order = orders[i];

            if (timeFrom > 0 && order.timestamp < timeFrom) {
                continue;
            }

            if (startIndex == uint256(-1) && timeFrom > 0) {
                startIndex = i;
            }

            if ((maker != address(0) && order.maker != maker)) {
                continue;
            }

            if (orderStatus != OrderStatus.invalid && order.status != orderStatus) {
                continue;
            }

            if (timeTo > 0 && order.timestamp > timeTo) {
                endIndex = i;
                break;
            }

            count = count.add(1);
        }

        if (startIndex == uint256(-1)) {
            startIndex = 0;
        }

        if (endIndex == 0) {
            endIndex = orders.length;
        }

        return (count, startIndex, endIndex);
    }

    /**
     * @notice Get order fills of given params
     * @param askAssetAddress address of the ask asset
     * @param bidAssetAddress address fo the bid asset
     * @param taker address of the taker
     * @param timeFrom timestamp
     * @param timeTo timestamp
     */
    function getOrderFills(
        address askAssetAddress,
        address bidAssetAddress,
        address taker,
        uint256 timeFrom,
        uint256 timeTo
    ) public view returns (OrderFill[] memory) {
        OrderFill[] storage fills = _orderFills[bidAssetAddress][askAssetAddress];

        if (fills.length == 0) return new OrderFill[](0);

        uint count = 0;
        uint endIndex = 0;
        uint startIndex = 0;

        (count, startIndex, endIndex) = _getOrderFillsRange(fills, taker, timeFrom, timeTo);

        OrderFill[] memory results = new OrderFill[](count);

        uint index = 0;
        for (uint i = startIndex; i < endIndex; i++) {
            OrderFill storage fill = fills[i];

            if (taker != address(0) && fill.taker != taker) {
                continue;
            }

            results[index] = fills[i];
            index = index.add(1);
        }

        return results;
    }

    /**
     * @notice get order fills range of given params
     * @param fills list of order fill
     * @param taker address of the taker
     * @param timeFrom timestamp
     * @param timeTo timestamp
     */
    function _getOrderFillsRange(
        OrderFill[] storage fills,
        address taker,
        uint256 timeFrom,
        uint256 timeTo
    ) internal view returns (uint256, uint256, uint256) {
        uint count = 0;
        uint startIndex = uint256(-1);
        uint endIndex = 0;

        for (uint i = 0; i < fills.length; i++) {
            OrderFill storage fill = fills[i];

            if (timeFrom > 0 && fill.timestamp < timeFrom) {
                continue;
            }

            if (startIndex == uint256(-1) && timeFrom > 0) {
                startIndex = i;
            }

            if (taker != address(0) && fill.taker != taker) {
                continue;
            }

            if (timeTo > 0 && fill.timestamp > timeTo) {
                endIndex = i;
                break;
            }

            count = count.add(1);
        }

        if (startIndex == uint256(-1)) {
            startIndex = 0;
        }

        if (endIndex == 0) {
            endIndex = fills.length;
        }

        return (count, startIndex, endIndex);
    }

    // Reserved storage space to allow for layout changes in the future.
    uint256[50] private ______gap;
}
