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

    // solhint-disable max-line-length, no-empty-blocks, function-max-lines
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
    ) public view returns (Order[] memory results) {
        Order[] storage orders = _orders[bidAssetAddress][askAssetAddress];

        if (orders.length == 0) return new Order[](0);

        assembly {
            let mem_offset := mload(0x40)
            mstore(mem_offset, orders_slot)
            let position := keccak256(mem_offset, 0x20)
            mstore(0x40, add(mem_offset, 0xe0))

            mstore(add(mem_offset, 0x20), sload(orders_slot))
            mstore(add(mem_offset, 0x40), 0)
            mstore(add(mem_offset, 0x60), mload(add(mem_offset, 0x20)))

            // mem_offset
            // 0x00 orders_slot
            // 0x20 orders.length
            // 0x40 startIndex
            // 0x60 endIndex
            // 0x80 count
            // 0xa0 temp1
            // 0xc0 length

            switch gt(timeFrom, 0)
            case 1 {
                let s := 0
                let e := sub(mload(add(mem_offset, 0x20)), 1)
                let m := div(add(s, e), 2)

                for {} lt(s, e) {} {
                    let t := sload(add(add(position, mul(m, 12)), 10))

                    switch lt(t, timeFrom)
                    case 1 {
                        s := add(m, 1)
                        m := div(add(s, e), 2)
                    }
                    case 0 {
                        switch gt(t, timeFrom)
                        case 1 {
                            e := m
                            m := div(add(s, e), 2)
                        }
                        case 0 {
                            // m := add(m, 1)
                            s := e
                        }
                    }

                    mstore(add(mem_offset, 0xc0), add(mload(add(mem_offset, 0xc0)), 1))
                }

                mstore(add(mem_offset, 0x40), m)
            }

            switch gt(timeTo, 0)
            case 1 {
                let s := 0
                let e := sub(mload(add(mem_offset, 0x20)), 1)
                let m := div(add(s, e), 2)

                for {} lt(s, e) {} {
                    let t := sload(add(add(position, mul(m, 12)), 10))

                    switch lt(t, timeTo)
                    case 1 {
                        s := add(m, 1)
                        m := div(add(s, e), 2)
                    }
                    case 0 {
                        switch gt(t, timeTo)
                        case 1 {
                            e := m
                            m := div(add(s, e), 2)
                        }
                        case 0 {
                            m := add(m, 1)
                            s := e
                        }
                    }
                }

                mstore(add(mem_offset, 0x60), m)
            }

            results := mload(0x40)
            mstore(0x40, add(results, mul(0x20, add(sub(mload(add(mem_offset, 0x60)), mload(add(mem_offset, 0x40))), 1))))

            for { let i := mload(add(mem_offset, 0x40)) } lt(i, mload(add(mem_offset, 0x60))) { i := add(i, 1) } {
                let order_position := add(position, mul(i, 12))
                let order_maker := and(0x000000000000000000000000ffffffffffffffffffffffffffffffffffffffff, sload(add(order_position, 1)))

                switch and(iszero(eq(maker, 0x0000000000000000000000000000000000000000)), iszero(eq(order_maker, maker)))
                case 1 {
                }
                case 0 {
                    let order_status := sload(add(order_position, 9))

                    switch and(gt(orderStatus, 0), iszero(eq(order_status, orderStatus)))
                    case 1 {
                    }
                    case 0 {
                        mstore(add(mem_offset, 0x80), add(mload(add(mem_offset, 0x80)), 1))

                        let offset := mload(0x40)
                        mstore(add(results, mul(0x20, mload(add(mem_offset, 0x80)))), offset)
                        mstore(0x40, add(offset, mul(0x20, 14)))

                        // nonce
                        mstore(offset, sload(order_position))

                        // maker
                        order_position := add(order_position, 1)
                        offset := add(offset, 0x20)
                        mstore(add(mem_offset, 0xa0), sload(order_position))
                        mstore(offset, and(0x000000000000000000000000ffffffffffffffffffffffffffffffffffffffff, mload(add(mem_offset, 0xa0))))

                        // askAssetProxyId
                        offset := add(offset, 0x20)
                        mstore(offset, mul(and(0x0000000000000000ffffffff0000000000000000000000000000000000000000, mload(add(mem_offset, 0xa0))), exp(2, 64)))

                        // askAssetAddress
                        order_position := add(order_position, 1)
                        offset := add(offset, 0x20)
                        mstore(add(mem_offset, 0xa0), sload(order_position))
                        mstore(offset, and(0x000000000000000000000000ffffffffffffffffffffffffffffffffffffffff, mload(add(mem_offset, 0xa0))))

                        // askAssetAmount
                        order_position := add(order_position, 1)
                        offset := add(offset, 0x20)
                        mstore(offset, sload(order_position))

                        // askAssetData
                        order_position := add(order_position, 1)
                        offset := add(offset, 0x20)
                        {
                            let q := mload(0x40)

                            mstore(add(mem_offset, 0xa0), sload(order_position))
                            mstore(add(mem_offset, 0xc0), and(0x00000000000000000000000000000000000000000000000000000000000000ff, mload(add(mem_offset, 0xa0))))
                            mstore(q, div(mload(add(mem_offset, 0xc0)), 2))
                            mstore(0x40, add(q, 0x20))
                            switch gt(mload(add(mem_offset, 0xc0)), 0)
                            case 1 {
                                mstore(add(q, 0x20), and(0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00, mload(add(mem_offset, 0xa0))))
                                mstore(0x40, add(q, 0x40))
                            }
                            mstore(offset, q)
                        }

                        // bidAssetProxyId
                        order_position := add(order_position, 1)
                        offset := add(offset, 0x20)
                        mstore(add(mem_offset, 0xa0), sload(order_position))
                        mstore(offset, mul(and(0x00000000000000000000000000000000000000000000000000000000ffffffff, mload(add(mem_offset, 0xa0))), exp(2, 224)))

                        // bidAssetAddress
                        offset := add(offset, 0x20)
                        mstore(offset, div(and(0x0000000000000000ffffffffffffffffffffffffffffffffffffffff00000000, mload(add(mem_offset, 0xa0))), exp(2, 32)))

                        // bidAssetAmount
                        order_position := add(order_position, 1)
                        offset := add(offset, 0x20)
                        mstore(offset, sload(order_position))

                        // bidAssetData
                        order_position := add(order_position, 1)
                        offset := add(offset, 0x20)
                        {
                            let q := mload(0x40)

                            mstore(add(mem_offset, 0xa0), sload(order_position))
                            mstore(add(mem_offset, 0xc0), and(0x00000000000000000000000000000000000000000000000000000000000000ff, mload(add(mem_offset, 0xa0))))
                            mstore(q, div(mload(add(mem_offset, 0xc0)), 2))
                            mstore(0x40, add(q, 0x20))
                            switch gt(mload(add(mem_offset, 0xc0)), 0)
                            case 1 {
                                mstore(add(q, 0x20), and(0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00, mload(add(mem_offset, 0xa0))))
                                mstore(0x40, add(q, 0x40))
                            }
                            mstore(offset, q)
                        }

                        // bidAssetFilledAmount
                        order_position := add(order_position, 1)
                        offset := add(offset, 0x20)
                        mstore(offset, sload(order_position))

                        // status
                        order_position := add(order_position, 1)
                        offset := add(offset, 0x20)
                        mstore(offset, sload(order_position))

                        // timestamp
                        order_position := add(order_position, 1)
                        offset := add(offset, 0x20)
                        mstore(offset, sload(order_position))

                        // auxiliary
                        order_position := add(order_position, 1)
                        offset := add(offset, 0x20)
                        {
                            let q := mload(0x40)

                            mstore(add(mem_offset, 0xa0), sload(order_position))
                            mstore(add(mem_offset, 0xc0), and(0x00000000000000000000000000000000000000000000000000000000000000ff, mload(add(mem_offset, 0xa0))))
                            mstore(q, div(mload(add(mem_offset, 0xc0)), 2))
                            mstore(0x40, add(q, 0x20))
                            switch gt(mload(add(mem_offset, 0xc0)), 0)
                            case 1 {
                                mstore(add(q, 0x20), and(0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00, mload(add(mem_offset, 0xa0))))
                                mstore(0x40, add(q, 0x40))
                            }
                            mstore(offset, q)
                        }
                    }
                }
            }

            mstore(results, mload(add(mem_offset, 0x80)))
        }
    }
    // solhint-enable max-line-length, no-empty-blocks, function-max-lines

    function currentPrice(
        address askAssetAddress,
        address bidAssetAddress
    ) public view returns (Price memory results) {
        return _currentPrice[bidAssetAddress][askAssetAddress];
    }

    // solhint-disable max-line-length, no-empty-blocks, function-max-lines
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
    ) public view returns (OrderFill[] memory results) {
        OrderFill[] storage fills = _orderFills[bidAssetAddress][askAssetAddress];

        if (fills.length == 0) return new OrderFill[](0);

        assembly {
            let mem_offset := mload(0x40)
            mstore(mem_offset, fills_slot)
            let position := keccak256(mem_offset, 0x20)
            mstore(0x40, add(mem_offset, 0xe0))

            mstore(add(mem_offset, 0x20), sload(fills_slot))
            mstore(add(mem_offset, 0x40), 0)
            mstore(add(mem_offset, 0x60), mload(add(mem_offset, 0x20)))

            // mem_offset
            // 0x00 fills_slot
            // 0x20 fills.length
            // 0x40 startIndex
            // 0x60 endIndex
            // 0x80 count
            // 0xa0 temp1
            // 0xc0 length

            switch gt(timeFrom, 0)
            case 1 {
                let s := 0
                let e := sub(mload(add(mem_offset, 0x20)), 1)
                let m := div(add(s, e), 2)

                for {} lt(s, e) {} {
                    let t := sload(add(add(position, mul(m, 12)), 10))

                    switch lt(t, timeFrom)
                    case 1 {
                        s := add(m, 1)
                        m := div(add(s, e), 2)
                    }
                    case 0 {
                        switch gt(t, timeFrom)
                        case 1 {
                            e := m
                            m := div(add(s, e), 2)
                        }
                        case 0 {
                            // m := add(m, 1)
                            s := e
                        }
                    }

                    mstore(add(mem_offset, 0xc0), add(mload(add(mem_offset, 0xc0)), 1))
                }

                mstore(add(mem_offset, 0x40), m)
            }

            switch gt(timeTo, 0)
            case 1 {
                let s := 0
                let e := sub(mload(add(mem_offset, 0x20)), 1)
                let m := div(add(s, e), 2)

                for {} lt(s, e) {} {
                    let t := sload(add(add(position, mul(m, 12)), 10))

                    switch lt(t, timeTo)
                    case 1 {
                        s := add(m, 1)
                        m := div(add(s, e), 2)
                    }
                    case 0 {
                        switch gt(t, timeTo)
                        case 1 {
                            e := m
                            m := div(add(s, e), 2)
                        }
                        case 0 {
                            m := add(m, 1)
                            s := e
                        }
                    }
                }

                mstore(add(mem_offset, 0x60), m)
            }

            results := mload(0x40)
            mstore(0x40, add(results, mul(0x20, add(sub(mload(add(mem_offset, 0x60)), mload(add(mem_offset, 0x40))), 1))))

            for { let i := mload(add(mem_offset, 0x40)) } lt(i, mload(add(mem_offset, 0x60))) { i := add(i, 1) } {
                let order_position := add(position, mul(i, 12))
                let order_taker := and(0x000000000000000000000000ffffffffffffffffffffffffffffffffffffffff, sload(add(order_position, 1)))

                switch and(iszero(eq(taker, 0x0000000000000000000000000000000000000000)), iszero(eq(order_taker, taker)))
                case 1 {
                }
                case 0 {
                    mstore(add(mem_offset, 0x80), add(mload(add(mem_offset, 0x80)), 1))

                    let offset := mload(0x40)
                    mstore(add(results, mul(0x20, mload(add(mem_offset, 0x80)))), offset)
                    mstore(0x40, add(offset, mul(0x20, 14)))

                    // nonce
                    mstore(offset, sload(order_position))

                    // taker
                    order_position := add(order_position, 1)
                    offset := add(offset, 0x20)
                    mstore(add(mem_offset, 0xa0), sload(order_position))
                    mstore(offset, and(0x000000000000000000000000ffffffffffffffffffffffffffffffffffffffff, mload(add(mem_offset, 0xa0))))

                    // askAssetProxyId
                    offset := add(offset, 0x20)
                    mstore(offset, mul(and(0x0000000000000000ffffffff0000000000000000000000000000000000000000, mload(add(mem_offset, 0xa0))), exp(2, 64)))

                    // askAssetAddress
                    order_position := add(order_position, 1)
                    offset := add(offset, 0x20)
                    mstore(add(mem_offset, 0xa0), sload(order_position))
                    mstore(offset, and(0x000000000000000000000000ffffffffffffffffffffffffffffffffffffffff, mload(add(mem_offset, 0xa0))))

                    // askAssetAmount
                    order_position := add(order_position, 1)
                    offset := add(offset, 0x20)
                    mstore(offset, sload(order_position))

                    // askAssetData
                    order_position := add(order_position, 1)
                    offset := add(offset, 0x20)
                    {
                        let q := mload(0x40)

                        mstore(add(mem_offset, 0xa0), sload(order_position))
                        mstore(add(mem_offset, 0xc0), and(0x00000000000000000000000000000000000000000000000000000000000000ff, mload(add(mem_offset, 0xa0))))
                        mstore(q, div(mload(add(mem_offset, 0xc0)), 2))
                        mstore(0x40, add(q, 0x20))
                        switch gt(mload(add(mem_offset, 0xc0)), 0)
                        case 1 {
                            mstore(add(q, 0x20), and(0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00, mload(add(mem_offset, 0xa0))))
                            mstore(0x40, add(q, 0x40))
                        }
                        mstore(offset, q)
                    }

                    // bidAssetProxyId
                    order_position := add(order_position, 1)
                    offset := add(offset, 0x20)
                    mstore(add(mem_offset, 0xa0), sload(order_position))
                    mstore(offset, mul(and(0x00000000000000000000000000000000000000000000000000000000ffffffff, mload(add(mem_offset, 0xa0))), exp(2, 224)))

                    // bidAssetAddress
                    offset := add(offset, 0x20)
                    mstore(offset, div(and(0x0000000000000000ffffffffffffffffffffffffffffffffffffffff00000000, mload(add(mem_offset, 0xa0))), exp(2, 32)))

                    // bidAssetAmount
                    order_position := add(order_position, 1)
                    offset := add(offset, 0x20)
                    mstore(offset, sload(order_position))

                    // bidAssetData
                    order_position := add(order_position, 1)
                    offset := add(offset, 0x20)
                    {
                        let q := mload(0x40)

                        mstore(add(mem_offset, 0xa0), sload(order_position))
                        mstore(add(mem_offset, 0xc0), and(0x00000000000000000000000000000000000000000000000000000000000000ff, mload(add(mem_offset, 0xa0))))
                        mstore(q, div(mload(add(mem_offset, 0xc0)), 2))
                        mstore(0x40, add(q, 0x20))
                        switch gt(mload(add(mem_offset, 0xc0)), 0)
                        case 1 {
                            mstore(add(q, 0x20), and(0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00, mload(add(mem_offset, 0xa0))))
                            mstore(0x40, add(q, 0x40))
                        }
                        mstore(offset, q)
                    }

                    // bidAssetFilledAmount
                    order_position := add(order_position, 1)
                    offset := add(offset, 0x20)
                    mstore(offset, sload(order_position))

                    // status
                    order_position := add(order_position, 1)
                    offset := add(offset, 0x20)
                    mstore(offset, sload(order_position))

                    // timestamp
                    order_position := add(order_position, 1)
                    offset := add(offset, 0x20)
                    mstore(offset, sload(order_position))

                    // auxiliary
                    order_position := add(order_position, 1)
                    offset := add(offset, 0x20)
                    {
                        let q := mload(0x40)

                        mstore(add(mem_offset, 0xa0), sload(order_position))
                        mstore(add(mem_offset, 0xc0), and(0x00000000000000000000000000000000000000000000000000000000000000ff, mload(add(mem_offset, 0xa0))))
                        mstore(q, div(mload(add(mem_offset, 0xc0)), 2))
                        mstore(0x40, add(q, 0x20))
                        switch gt(mload(add(mem_offset, 0xc0)), 0)
                        case 1 {
                            mstore(add(q, 0x20), and(0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00, mload(add(mem_offset, 0xa0))))
                            mstore(0x40, add(q, 0x40))
                        }
                        mstore(offset, q)
                    }
                }
            }

            mstore(results, mload(add(mem_offset, 0x80)))
        }
    }
    // solhint-enable max-line-length, no-empty-blocks, function-max-lines

    // Reserved storage space to allow for layout changes in the future.
    uint256[50] private ______gap;
}
