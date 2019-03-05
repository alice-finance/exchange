pragma solidity ^0.5.3;
pragma experimental ABIEncoderV2;

import "./OrderBook.sol";


contract Statistics is OrderBook {
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
    ) public view returns (Quote[] memory) {
        if (interval == 0) {
            interval = MIN_QUOTE_TIME;
        }

        if (timeFrom == 0) {
            timeFrom = now - (now % MIN_QUOTE_TIME) - 3600; // solhint-disable-line not-rely-on-time
        }

        if (timeTo == 0) {
            timeTo = now - (now % MIN_QUOTE_TIME); // solhint-disable-line not-rely-on-time
        }

        return _getQuotes(askAssetAddress, bidAssetAddress, timeFrom, timeTo, interval);
    }

    /**
     * @notice Get quotes of given params
     * @param askAssetAddress address of the ask asset
     * @param bidAssetAddress address fo the bid asset
     * @param timeFrom timestamp
     * @param timeTo timestamp
     * @param interval tick interval
     */
    function _getQuotes(
        address askAssetAddress,
        address bidAssetAddress,
        uint256 timeFrom,
        uint256 timeTo,
        uint256 interval
    ) internal view returns (Quote[] memory) {
        mapping(uint256 => Quote) storage records = _quotes[bidAssetAddress][askAssetAddress];
        uint256 rangeCount = 0;
        uint256 rangeInterval = 0;
        uint256 rangeStart = 0;

        (rangeCount, rangeInterval, rangeStart) = _getQuotesRange(timeFrom, timeTo, interval);
        return _calculateQuotes(records, rangeCount, rangeStart, rangeInterval);
    }

    /**
     * @notice Get range of quotes
     * @param timeFrom timestamp
     * @param timeTo timestamp
     * @param interval tick interval
     */
    function _getQuotesRange(
        uint256 timeFrom,
        uint256 timeTo,
        uint256 interval
    ) internal pure returns (uint256 rangeCount, uint256 rangeInterval, uint256 rangeStart) {
        uint256 firstTime = timeFrom - (timeFrom % MIN_QUOTE_TIME);
        uint256 lastTime = timeTo - (timeTo % MIN_QUOTE_TIME); // solhint-disable-line not-rely-on-time

        firstTime = firstTime - (firstTime % interval);
        lastTime = lastTime - (lastTime % interval);
        rangeCount = ((lastTime - firstTime) / interval);

        rangeStart = firstTime;
        rangeInterval = interval;
    }

    /**
     * @notice Get quotes
     * @param records mapping(timestamp => Quote)
     * @param rangeCount count of ranges
     * @param rangeStart start timestamp of first range
     * @param rangeInterval interval of ranges
     */
    function _calculateQuotes(
        mapping(uint256 => Quote) storage records,
        uint256 rangeCount,
        uint256 rangeStart,
        uint256 rangeInterval
    ) internal view returns (Quote[] memory) {
        Quote[] memory quotes = new Quote[](rangeCount);

        uint256 rangeIndex;

        while (rangeIndex < rangeCount) {
            quotes[rangeIndex].timeOpen = rangeStart;
            quotes[rangeIndex].timeClose = rangeStart + rangeInterval - 1;

            for (uint i = 0; i < rangeInterval; i += MIN_QUOTE_TIME) {
                Quote storage record = records[rangeStart + i];

                if (record.volume > 0) {
                    if (i == 0) {
                        quotes[rangeIndex].open = record.open;
                        quotes[rangeIndex].high = record.high;
                        quotes[rangeIndex].low = record.low;
                    } else {
                        if (quotes[rangeIndex].high.ask * record.high.bid
                            < quotes[rangeIndex].high.bid * record.high.ask) {
                            quotes[rangeIndex].high = record.high;
                        }

                        if (quotes[rangeIndex].low.ask * record.low.bid
                            > quotes[rangeIndex].low.bid * record.low.ask) {
                            quotes[rangeIndex].low = record.low;
                        }
                    }

                    if (i == rangeInterval - MIN_QUOTE_TIME) {
                        quotes[rangeIndex].close = record.close;
                    }

                    quotes[rangeIndex].volume = quotes[rangeIndex].volume + record.volume;
                }
            }

            rangeStart = rangeStart + rangeInterval;
            rangeIndex += 1;
        }

        return quotes;
    }
}
