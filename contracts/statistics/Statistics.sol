pragma solidity ^0.5.11;
pragma experimental ABIEncoderV2;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "../pubsub/ISubscriber.sol";
import "../exchange/Constants.sol";

contract Statistics is ISubscriber, Constants {
    using SafeMath for uint256;

    uint256 public constant MIN_QUOTE_TIME = 60;

    event PriceChanged(
        address indexed askAssetAddress,
        address indexed bidAssetAddress,
        uint256 askAssetAmount,
        uint256 bidAssetAmount,
        uint256 timestamp
    );

    event QuoteChanged(
        address indexed askAssetAddress,
        address indexed bidAssetAddress,
        uint256 indexed timeOpen,
        uint256 timeClose,
        uint256 openAsk,
        uint256 openBid,
        uint256 highAsk,
        uint256 highBid,
        uint256 lowAsk,
        uint256 lowBid,
        uint256 closeAsk,
        uint256 closeBid,
        uint256 volume
    );

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

    /// @dev mapping bidAssetAddress => askAssetAddress => orderNonce => isOrderRegistered
    mapping(address => mapping(address => mapping(uint256 => bool))) internal _orderRegistered;
    /// @dev mapping bidAssetAddress => askAssetAddress => orderNonce => totalAmountToFill
    mapping(address => mapping(address => mapping(uint256 => uint256))) internal _orderAmountToFill;
    /// @dev mapping bidAssetAddress => askAssetAddress => orderNonce => filledAmount
    mapping(address => mapping(address => mapping(uint256 => uint256))) internal _orderFilledAmount;

    /// @dev mapping bidAssetAddress => askAssetAddress => Price
    mapping(address => mapping(address => Price)) internal _currentPrice;

    /// @dev mapping bidAssetAddress => askAssetAddress => Price[]
    mapping(address => mapping(address => Price[])) internal _prices;
    /// @dev mapping bidAssetAddress => askAssetAddress => orderNonce => priceId;
    mapping(address => mapping(address => mapping(uint256 => uint256))) internal _orderPriceId;

    /// @dev mapping bidAssetAddress => askAssetAddress => timestamp => Quote
    mapping(address => mapping(address => mapping(uint256 => Quote))) internal _quotes;

    function isSubscriber() public view returns (bool) {
        return true;
    }

    function notify(bytes32 eventHash, bytes memory data)
        public
        returns (bool)
    {
        if (eventHash == SIG_ORDER_CREATED) {
            _handleOrderCreated(data);
        } else if (eventHash == SIG_ORDER_FILLED) {
            _handleOrderFilled(data);
        } else if (eventHash == SIG_ORDER_CANCELLED) {
            _handleOrderCancelled(data);
        }
        return true;
    }

    function getCurrentPrice(address askAssetAddress, address bidAssetAddress)
        public
        view
        returns (Price memory results)
    {
        return _currentPrice[bidAssetAddress][askAssetAddress];
    }

    // solhint-disable max-line-length, no-empty-blocks, function-max-lines
    /**
     * @notice Get quotes of given params
     * @param askAssetAddress address of the ask asset
     * @param bidAssetAddress address fo the bid asset
     * @param timeFrom timestamp
     * @param timeTo timestamp
     * @param interval tick interval
     */
    function getQuotes(
        address askAssetAddress,
        address bidAssetAddress,
        uint256 timeFrom,
        uint256 timeTo,
        uint256 interval
    ) public view returns (Quote[] memory results) {
        uint256 minQuoteTime = MIN_QUOTE_TIME;

        assembly {
            switch eq(interval, 0)
                case 1 {
                    interval := minQuoteTime
                }

            switch eq(timeTo, 0)
                case 1 {
                    timeTo := timestamp
                }

            timeTo := sub(timeTo, mod(timeTo, minQuoteTime))

            switch eq(timeFrom, 0)
                case 1 {
                    timeFrom := sub(timeTo, 3600)
                }

            timeFrom := sub(timeFrom, mod(timeFrom, minQuoteTime))

            let mem_pos := mload(0x40)
            mstore(0x40, add(mem_pos, 0x40))

            // mem_pos
            // 0x00 left
            // 0x20 right

            mstore(mem_pos, bidAssetAddress)
            mstore(add(mem_pos, 0x20), _quotes_slot)

            mstore(add(mem_pos, 0x20), keccak256(mem_pos, 0x40))
            mstore(mem_pos, askAssetAddress)

            mstore(add(mem_pos, 0x20), keccak256(mem_pos, 0x40))

            let mem_offset := mload(0x40)
            mstore(0x40, add(mem_offset, 0x100))

            // mem_offset
            // 0x00 none
            // 0x20 rangeStart
            // 0x40 rangeCount
            // 0x60 rangeIndex
            // 0x80 itemIndex
            // 0xa0 temp1
            // 0xc0 temp2
            // 0xe0 temp3

            mstore(add(mem_offset, 0x20), timeFrom)
            mstore(add(mem_offset, 0xc0), mod(sub(timeTo, timeFrom), interval))

            switch gt(mload(add(mem_offset, 0xc0)), 0)
                case 1 {
                    mstore(
                        add(mem_offset, 0x20),
                        add(timeFrom, mload(add(mem_offset, 0xc0)))
                    )
                }

            mstore(
                add(mem_offset, 0x40),
                div(sub(timeTo, mload(add(mem_offset, 0x20))), interval)
            )

            results := mload(0x40)
            mstore(results, mload(add(mem_offset, 0x40)))
            mstore(
                0x40,
                add(results, mul(add(mload(add(mem_offset, 0x40)), 1), 0x20))
            )

            for {

            } lt(mload(add(mem_offset, 0x60)), mload(add(mem_offset, 0x40))) {

            } {
                let offset := mload(0x40)
                mstore(
                    add(
                        results,
                        add(mul(mload(add(mem_offset, 0x60)), 0x20), 0x20)
                    ),
                    offset
                )
                mstore(0x40, add(offset, mul(0x20, 7)))

                // offset
                // 0x00 timeOpen
                // 0x20 timeClose
                // 0x40 open offset
                // 0x60 high offset
                // 0x80 low offset
                // 0xa0 close offset
                // 0xc0 volume

                mstore(offset, mload(add(mem_offset, 0x20))) // timeOpen
                mstore(
                    add(offset, 0x20),
                    sub(add(mload(add(mem_offset, 0x20)), interval), 1)
                ) // timeClose
                mstore(add(offset, 0x40), mload(0x40)) // open offset
                mstore(0x40, add(mload(add(offset, 0x40)), 0x40))
                mstore(add(offset, 0x60), mload(0x40)) // high offset
                mstore(0x40, add(mload(add(offset, 0x60)), 0x40))
                mstore(add(offset, 0x80), mload(0x40)) // low offset
                mstore(0x40, add(mload(add(offset, 0x80)), 0x40))
                mstore(add(offset, 0xa0), mload(0x40)) // close offset
                mstore(0x40, add(mload(add(offset, 0xa0)), 0x40))

                mstore(add(mem_offset, 0x80), 0)

                for {

                } lt(mload(add(mem_offset, 0x80)), interval) {
                    mstore(
                        add(mem_offset, 0x80),
                        add(mload(add(mem_offset, 0x80)), minQuoteTime)
                    )
                } {
                    mstore(
                        mem_pos,
                        add(
                            mload(add(mem_offset, 0x20)),
                            mload(add(mem_offset, 0x80))
                        )
                    )
                    let record_position := keccak256(mem_pos, 0x40)

                    // volume
                    mstore(
                        add(mem_offset, 0xa0),
                        sload(add(record_position, 10))
                    )

                    switch gt(mload(add(mem_offset, 0xa0)), 0)
                        case 1 {
                            mstore(
                                add(mem_offset, 0xc0),
                                sload(add(record_position, 2))
                            )
                            mstore(
                                add(mem_offset, 0xe0),
                                sload(add(record_position, 3))
                            )

                            switch and(
                                and(
                                    eq(mload(mload(add(offset, 0x40))), 0),
                                    eq(
                                        mload(
                                            add(mload(add(offset, 0x40)), 0x20)
                                        ),
                                        0
                                    )
                                ),
                                and(
                                    gt(mload(add(mem_offset, 0xc0)), 0),
                                    gt(mload(add(mem_offset, 0xe0)), 0)
                                )
                            )
                                case 1 {
                                    // open
                                    mstore(
                                        mload(add(offset, 0x40)),
                                        mload(add(mem_offset, 0xc0))
                                    )
                                    mstore(
                                        add(mload(add(offset, 0x40)), 0x20),
                                        mload(add(mem_offset, 0xe0))
                                    )
                                    // high
                                    mstore(
                                        mload(add(offset, 0x60)),
                                        sload(add(record_position, 4))
                                    )
                                    mstore(
                                        add(mload(add(offset, 0x60)), 0x20),
                                        sload(add(record_position, 5))
                                    )
                                    // low
                                    mstore(
                                        mload(add(offset, 0x80)),
                                        sload(add(record_position, 6))
                                    )
                                    mstore(
                                        add(mload(add(offset, 0x80)), 0x20),
                                        sload(add(record_position, 7))
                                    )
                                }
                                case 0 {
                                    // high
                                    mstore(
                                        add(mem_offset, 0xc0),
                                        sload(add(record_position, 4))
                                    )
                                    mstore(
                                        add(mem_offset, 0xe0),
                                        sload(add(record_position, 5))
                                    )

                                    switch lt(
                                        mul(
                                            mload(add(mem_offset, 0xc0)),
                                            mload(
                                                add(
                                                    mload(add(offset, 0x60)),
                                                    0x20
                                                )
                                            )
                                        ),
                                        mul(
                                            mload(add(mem_offset, 0xe0)),
                                            mload(mload(add(offset, 0x60)))
                                        )
                                    )
                                        case 1 {
                                            mstore(
                                                mload(add(offset, 0x60)),
                                                mload(add(mem_offset, 0xc0))
                                            )
                                            mstore(
                                                add(
                                                    mload(add(offset, 0x60)),
                                                    0x20
                                                ),
                                                mload(add(mem_offset, 0xe0))
                                            )
                                        }

                                    // low
                                    mstore(
                                        add(mem_offset, 0xc0),
                                        sload(add(record_position, 6))
                                    )
                                    mstore(
                                        add(mem_offset, 0xe0),
                                        sload(add(record_position, 7))
                                    )

                                    switch gt(
                                        mul(
                                            mload(add(mem_offset, 0xc0)),
                                            mload(
                                                add(
                                                    mload(add(offset, 0x80)),
                                                    0x20
                                                )
                                            )
                                        ),
                                        mul(
                                            mload(add(mem_offset, 0xe0)),
                                            mload(mload(add(offset, 0x80)))
                                        )
                                    )
                                        case 1 {
                                            mstore(
                                                mload(add(offset, 0x80)),
                                                mload(add(mem_offset, 0xc0))
                                            )
                                            mstore(
                                                add(
                                                    mload(add(offset, 0x80)),
                                                    0x20
                                                ),
                                                mload(add(mem_offset, 0xe0))
                                            )
                                        }
                                }

                            // close
                            mstore(
                                add(mem_offset, 0xc0),
                                sload(add(record_position, 8))
                            )
                            mstore(
                                add(mem_offset, 0xe0),
                                sload(add(record_position, 9))
                            )

                            switch and(
                                gt(mload(add(mem_offset, 0xc0)), 0),
                                gt(mload(add(mem_offset, 0xe0)), 0)
                            )
                                case 1 {
                                    mstore(
                                        mload(add(offset, 0xa0)),
                                        mload(add(mem_offset, 0xc0))
                                    )
                                    mstore(
                                        add(mload(add(offset, 0xa0)), 0x20),
                                        mload(add(mem_offset, 0xe0))
                                    )
                                }

                            // volume
                            mstore(
                                add(offset, 0xc0),
                                sload(add(record_position, 10))
                            )
                        }
                }

                mstore(
                    add(mem_offset, 0x20),
                    add(mload(add(mem_offset, 0x20)), interval)
                )
                mstore(
                    add(mem_offset, 0x60),
                    add(mload(add(mem_offset, 0x60)), 1)
                )
            }
        }
    }
    // solhint-enable max-line-length, no-empty-blocks, function-max-lines

    /**
     * @notice add order's price to list
     */
    function _addOrderPrice(
        uint256 nonce,
        address askAssetAddress,
        address bidAssetAddress,
        uint256 askAssetAmount,
        uint256 bidAssetAmount
    ) internal {
        Price[] storage prices = _prices[bidAssetAddress][askAssetAddress];
        prices.length += 1;
        Price storage newPrice = prices[prices.length - 1];
        newPrice.ask = askAssetAmount;
        newPrice.bid = bidAssetAmount;

        Price storage currentPrice = _currentPrice[bidAssetAddress][askAssetAddress];
        _orderPriceId[bidAssetAddress][askAssetAddress][nonce] = prices.length - 1;

        if (
            currentPrice.ask * newPrice.bid > newPrice.ask * currentPrice.bid ||
            (currentPrice.ask == 0 && currentPrice.bid == 0)
        ) {
            currentPrice.ask = newPrice.ask;
            currentPrice.bid = newPrice.bid;

            emit PriceChanged(
                askAssetAddress,
                bidAssetAddress,
                currentPrice.ask,
                currentPrice.bid,
                now
            ); // solhint-disable-line not-rely-on-time,max-line-length
        }
    }

    /**
     * @notice remove order's price from list
     */
    function _removeOrderPrice(
        address askAssetAddress,
        address bidAssetAddress,
        uint256 askAssetAmount,
        uint256 bidAssetAmount
    ) internal {
        Price[] storage prices = _prices[bidAssetAddress][askAssetAddress];

        for (uint256 i = 0; i < prices.length; i++) {
            if (
                prices[i].ask == askAssetAmount &&
                prices[i].bid == bidAssetAmount
            ) {
                prices[i] = prices[prices.length - 1];
                prices.length--;
                break;
            }
        }

        Price storage current = _currentPrice[bidAssetAddress][askAssetAddress];
        if (current.ask == askAssetAmount && current.bid == bidAssetAmount) {
            _updateOrderPrice(askAssetAddress, bidAssetAddress);
        }
    }

    /**
     * @notice find lowest order price and update current price
     */
    function _updateOrderPrice(address askAssetAddress, address bidAssetAddress)
        internal
    {
        Price[] storage prices = _prices[bidAssetAddress][askAssetAddress];
        /// @dev set ask and bid MAX_AMOUNT + 1 which is invalid
        Price memory minimumPrice = Price(MAX_AMOUNT.add(1), MAX_AMOUNT.add(1));

        /// @dev find minimum price in list
        for (uint256 i = 0; i < prices.length; i++) {
            if (
                prices[i].ask * minimumPrice.bid <
                minimumPrice.ask * prices[i].bid
            ) {
                minimumPrice = prices[i];
            }
        }

        /// @dev check if minimumPrice is changed
        Price storage current = _currentPrice[bidAssetAddress][askAssetAddress];

        /// @dev minimum price changed
        if (
            minimumPrice.ask != MAX_AMOUNT.add(1) &&
            minimumPrice.bid != MAX_AMOUNT.add(1)
        ) {
            current.ask = minimumPrice.ask;
            current.bid = minimumPrice.bid;

            emit PriceChanged(
                askAssetAddress,
                bidAssetAddress,
                minimumPrice.ask,
                minimumPrice.bid,
                now
            ); // solhint-disable-line not-rely-on-time,max-line-length
        }
    }

    function _recordQuote(
        address askAssetAddress,
        address bidAssetAddress,
        uint256 askAssetAmount,
        uint256 bidAssetAmount,
        uint256 bidAssetFilledAmount,
        uint256 timestamp
    ) internal {
        uint256 timeOpen = timestamp.sub(timestamp.mod(MIN_QUOTE_TIME));
        Quote storage quote = _quotes[bidAssetAddress][askAssetAddress][timeOpen];

        if (quote.volume == 0) {
            quote.timeOpen = timeOpen;
            quote.timeClose = timeOpen + 59;
            quote.open = Price(askAssetAmount, bidAssetAmount);
        }

        if (
            quote.high.ask * bidAssetAmount < quote.high.bid * askAssetAmount ||
            (quote.high.ask == 0 && quote.high.bid == 0)
        ) {
            quote.high.ask = askAssetAmount;
            quote.high.bid = bidAssetAmount;
        }

        if (
            quote.low.ask * bidAssetAmount > quote.low.bid * askAssetAmount ||
            (quote.low.ask == 0 && quote.low.bid == 0)
        ) {
            quote.low.ask = askAssetAmount;
            quote.low.bid = bidAssetAmount;
        }

        quote.close.ask = askAssetAmount;
        quote.close.bid = bidAssetAmount;

        quote.volume = quote.volume.add(bidAssetFilledAmount);
    }

    function _handleOrderCreated(bytes memory data) internal {
        //prettier-ignore
        (
            uint256 nonce, , ,
            address askAssetAddress,
            uint256 askAssetAmount, , ,
            address bidAssetAddress,
            uint256 bidAssetAmount, ,
        ) = abi.decode(data, (uint256, address, bytes4, address, uint256, bytes, bytes4, address, uint256, bytes, uint256));

        _orderRegistered[bidAssetAddress][askAssetAddress][nonce] = true;
        _orderAmountToFill[bidAssetAddress][askAssetAddress][nonce] = bidAssetAmount;
        _orderFilledAmount[bidAssetAddress][askAssetAddress][nonce] = 0;

        _addOrderPrice(
            nonce,
            askAssetAddress,
            bidAssetAddress,
            askAssetAmount,
            bidAssetAmount
        );
    }

    function _handleOrderFilled(bytes memory data) internal {
        // prettier-ignore
        (
            uint256 nonce, ,
            address askAssetAddress,
            address bidAssetAddress,
            uint256 bidAssetFilledAmount, ,
        ) = abi.decode(data, (uint256, address, address, address, uint256, uint8, uint256));

        _orderFilledAmount[bidAssetAddress][askAssetAddress][nonce] += bidAssetFilledAmount;
        if (_orderFilledAmount[bidAssetAddress][askAssetAddress][nonce] == _orderAmountToFill[bidAssetAddress][askAssetAddress][nonce]) {
            _removeOrderPrice(nonce, askAssetAddress, bidAssetAddress);
        }
    }

    function _handleOrderCancelled(bytes memory data) internal {
        // prettier-ignore
        (
            uint256 nonce,
            address askAssetAddress,
            address bidAssetAddress,
        ) = abi.decode(data, (uint256, address, address, uint256));

        _removeOrderPrice(nonce, askAssetAddress, bidAssetAddress);
    }
}
