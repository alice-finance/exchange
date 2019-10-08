pragma solidity ^0.5.11;
pragma experimental ABIEncoderV2;

import "../exchange/Exchange.sol";

/**
 * @title Exchange
 */
contract ExchangeMock is Exchange {
    using SafeMath for uint256;
    using Math for uint256;

    /**
     * @dev Create order on order book
     * @notice Reverts when
     * @param params struct CreateOrderParams
     */
    function createOrder(CreateOrderParams memory params, uint256 timestamp) public {
        require(params.askAssetProxyId != 0, "askAssetProxyId is 0");
        require(params.askAssetAddress != address(0), "askAssetAddress is 0");
        require(
            params.askAssetAmount > 0,
            "askAssetAmount must be greater than 0"
        );
        require(
            params.askAssetAmount <= MAX_AMOUNT,
            "askAssetAmount exceeded limit"
        );

        require(params.bidAssetProxyId != 0, "bidAssetProxyId is 0");
        require(params.bidAssetAddress != address(0), "bidAssetAddress is 0");
        require(
            params.bidAssetAmount > 0,
            "bidAssetAmount must be greater than 0"
        );
        require(
            params.bidAssetAmount <= MAX_AMOUNT,
            "bidAssetAmount exceeded limit"
        );

        IAssetProxy askAssetProxy = _assetProxyOfProxyId[params
            .askAssetProxyId];
        require(
            address(askAssetProxy) != address(0),
            "askAssetProxy not found"
        );
        require(
            address(_assetProxyOfProxyId[params.bidAssetProxyId]) != address(0),
            "bidAssetProxy not found"
        );
        require(
            askAssetProxy.canTransferFrom(
                msg.sender,
                params.askAssetAmount,
                params.askAssetAddress,
                params.askAssetData
            ),
            "cannot transfer"
        );

        Order[] storage allOrders = _orders[params.bidAssetAddress][params
            .askAssetAddress];
        uint256 nonce = allOrders.length;
        allOrders.length += 1;
        allOrders[nonce].nonce = nonce;
        allOrders[nonce].maker = msg.sender;
        allOrders[nonce].askAssetProxyId = params.askAssetProxyId;
        allOrders[nonce].askAssetAddress = params.askAssetAddress;
        allOrders[nonce].askAssetAmount = params.askAssetAmount;
        allOrders[nonce].askAssetData = params.askAssetData;
        allOrders[nonce].bidAssetProxyId = params.bidAssetProxyId;
        allOrders[nonce].bidAssetAddress = params.bidAssetAddress;
        allOrders[nonce].bidAssetAmount = params.bidAssetAmount;
        allOrders[nonce].bidAssetData = params.bidAssetData;
        allOrders[nonce].status = OrderStatus.fillable;
        allOrders[nonce].timestamp = timestamp;
        // solhint-disable-line not-rely-on-time

        emit OrderCreated(
            nonce,
            msg.sender,
            params.askAssetProxyId,
            params.askAssetAddress,
            params.askAssetAmount,
            params.askAssetData,
            params.bidAssetProxyId,
            params.bidAssetAddress,
            params.bidAssetAmount,
            params.bidAssetData,
            timestamp // solhint-disable-line not-rely-on-time
        );

        _publishEvent(
            SIG_ORDER_CREATED,
            abi.encode(
                nonce,
                msg.sender,
                params.askAssetProxyId,
                params.askAssetAddress,
                params.askAssetAmount,
                params.askAssetData,
                params.bidAssetProxyId,
                params.bidAssetAddress,
                params.bidAssetAmount,
                params.bidAssetData,
                timestamp
            )
        );
    }

    /**
     * @notice Fill order with given params
     * @param params struct FillOrderParams
     */
    function fillOrderMock(FillOrderParams memory params, uint256 timestamp) public {
        require(params.askAssetAddress != address(0), "askAssetAddress is 0");
        require(params.bidAssetAddress != address(0), "bidAssetAddress is 0");

        require(params.bidAssetAmountToFill > 0, "bidAssetAmountToFill is 0");
        require(
            params.bidAssetAmountToFill <= MAX_AMOUNT,
            "bidAssetAmountToFill exceeded limit"
        );

        require(
            _orders[params.bidAssetAddress][params.askAssetAddress].length >
                params.nonce,
            "order not exists"
        );
        Order storage order = _orders[params.bidAssetAddress][params
            .askAssetAddress][params.nonce];

        require(order.status == OrderStatus.fillable, "order is not fillable");

        require(
            _fillOrderMock(
                params.askAssetAddress,
                params.bidAssetAddress,
                params.nonce,
                msg.sender,
                params.bidAssetAmountToFill,
                timestamp
            ),
            "order not filled"
        );
    }

    /**
     * @notice Fill order
     */
    function _fillOrderMock(
        address askAssetAddress,
        address bidAssetAddress,
        uint256 nonce,
        address taker,
        uint256 bidAssetAmountToFill,
        uint256 timestamp
    ) internal returns (bool) {
        Order storage order = _orders[bidAssetAddress][askAssetAddress][nonce];

        // Below will always return valid assetProxy because cannot create order without properly setted proxy
        IAssetProxy askAssetProxy = _assetProxyOfProxyId[order.askAssetProxyId];
        IAssetProxy bidAssetProxy = _assetProxyOfProxyId[order.bidAssetProxyId];

        // cut fill amount to remaining if the user tries to fill larger amount than remaining
        uint256 amountToFill = Math.min(
            bidAssetAmountToFill,
            order.bidAssetAmount.sub(order.bidAssetFilledAmount)
        );
        uint256 askAssetAmountToTake = amountToFill
            .mul(order.askAssetAmount)
            .div(order.bidAssetAmount);

        if (askAssetAmountToTake < 1) return false;

        order.bidAssetFilledAmount = order.bidAssetFilledAmount.add(
            amountToFill
        );

        // update order status
        _updateOrderStatus(order);
        _recordOrderFillMock(order, taker, amountToFill, timestamp);

        _exchangeAssets(
            order.maker,
            askAssetProxy,
            order.askAssetAddress,
            askAssetAmountToTake,
            order.askAssetData,
            taker,
            bidAssetProxy,
            order.bidAssetAddress,
            amountToFill,
            order.bidAssetData
        );

        return true;
    }

    /**
     * @notice record every fills
     * @param order Struct Order
     * @param taker The address of the taker
     * @param bidAssetAmountToFill The amount to fill to given order
     */
    function _recordOrderFillMock(
        Order storage order,
        address taker,
        uint256 bidAssetAmountToFill,
        uint256 timestamp
    ) internal returns (uint256) {
        OrderFill[] storage fills = _orderFills[order.bidAssetAddress][order
            .askAssetAddress];
        uint256 index = fills.length;

        fills.length = fills.length.add(1);

        fills[index].orderNonce = order.nonce;
        fills[index].taker = taker;
        fills[index].askAssetProxyId = order.askAssetProxyId;
        fills[index].askAssetAddress = order.askAssetAddress;
        fills[index].askAssetAmount = order.askAssetAmount;
        fills[index].askAssetData = order.askAssetData;
        fills[index].bidAssetProxyId = order.bidAssetProxyId;
        fills[index].bidAssetAddress = order.bidAssetAddress;
        fills[index].bidAssetAmount = order.bidAssetAmount;
        fills[index].bidAssetData = order.bidAssetData;
        fills[index].bidAssetFilledAmount = bidAssetAmountToFill;
        fills[index].status = order.status;
        fills[index].timestamp = timestamp;
        // solhint-disable-line not-rely-on-time
        fills[index].auxiliary = order.auxiliary;

        emit OrderFilled(
            order.nonce,
            taker,
            order.askAssetAddress,
            order.bidAssetAddress,
            order.bidAssetFilledAmount,
            order.status,
            timestamp // solhint-disable-line not-rely-on-time
        );

        _publishEvent(
            SIG_ORDER_FILLED,
            abi.encode(
                order.nonce,
                taker,
                order.askAssetAddress,
                order.bidAssetAddress,
                order.bidAssetFilledAmount,
                order.status,
                timestamp
            )
        );

        return index;
    }
}
