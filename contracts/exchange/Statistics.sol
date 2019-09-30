pragma solidity ^0.5.3;
pragma experimental ABIEncoderV2;

import "./OrderBook.sol";

contract Statistics is OrderBook {
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
}
