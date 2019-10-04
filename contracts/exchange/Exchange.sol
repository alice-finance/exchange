pragma solidity ^0.5.11;
pragma experimental ABIEncoderV2;

import "@openzeppelin/upgrades/contracts/Initializable.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/math/Math.sol";

import "../ownership/Ownable.sol";
import "../proxy/AssetProxyRegistry.sol";
import "../pubsub/Publisher.sol";
import "./OrderBook.sol";

/**
 * @title Exchange
 */
contract Exchange is
    Initializable,
    Ownable,
    AssetProxyRegistry,
    Publisher,
    OrderBook
{
    using SafeMath for uint256;
    using Math for uint256;

    bytes32 constant EXCHANGE_ORDER_CREATED = 0x6d97b3b78773496fdcf21021287a6d37bfe562951a0c8840c95fa3a4c69499f3; //keccak256("exchange.order.created");
    bytes32 constant EXCHANGE_ORDER_FILLED = 0xe2fef4a810b4246b407ef2daa0558c2840b904cde1b17553af885ef94ff32153; //keccak256("exchange.order.filled");
    bytes32 constant EXCHANGE_ORDER_CANCELLED = 0xbe701c5a1d02a85555c0dab90e00eee0381ffb2c1b236368fa996aeae82a0ea3; //keccak256("exchange.order.cancelled");

    struct CreateOrderParams {
        bytes4 askAssetProxyId;
        address askAssetAddress;
        uint256 askAssetAmount;
        bytes askAssetData;
        bytes4 bidAssetProxyId;
        address bidAssetAddress;
        uint256 bidAssetAmount;
        bytes bidAssetData;
        uint256 feeAmount;
    }

    struct FillOrderParams {
        address askAssetAddress;
        address bidAssetAddress;
        uint256 nonce;
        uint256 bidAssetAmountToFill;
        uint256 feeAmount;
    }

    struct FillOrdersParams {
        address askAssetAddress;
        address bidAssetAddress;
        uint256[] nonces;
        uint256 bidAssetAmountToFill;
        uint256 feeAmount;
    }

    struct CancelOrderParams {
        address askAssetAddress;
        address bidAssetAddress;
        uint256 nonce;
    }

    event OrderCreated(
        uint256 nonce,
        address indexed maker,
        bytes4 askAssetProxyId,
        address indexed askAssetAddress,
        uint256 askAssetAmount,
        bytes askAssetData,
        bytes4 bidAssetProxyId,
        address indexed bidAssetAddress,
        uint256 bidAssetAmount,
        bytes bidAssetData,
        uint256 timestamp
    );

    event OrderFilled(
        address indexed askAssetAddress,
        address indexed bidAssetAddress,
        uint256 nonce,
        address indexed taker,
        uint256 bidAssetFilledAmount,
        OrderStatus status,
        uint256 timestamp
    );

    event OrderCancelled(
        address indexed askAssetAddress,
        address indexed bidAssetAddress,
        uint256 nonce,
        uint256 timestamp
    );

//    event PriceChanged(
//        address indexed askAssetAddress,
//        address indexed bidAssetAddress,
//        uint256 askAssetAmount,
//        uint256 bidAssetAmount,
//        uint256 timestamp
//    );

    function initialize(address sender) public initializer {
        Ownable.initialize(sender);
    }

    /**
     * @dev Register AssetProxy contract
     * @param proxyId proxy ID of asset proxy
     * @param assetProxy address of AssetProxy contract
     */
    function registerAssetProxy(bytes4 proxyId, IAssetProxy assetProxy)
        public
        onlyOwner
    {
        super.registerAssetProxy(proxyId, assetProxy);
    }

    function addSubscriber(bytes32 eventHash, address subscriber) public onlyOwner returns (bool)  {
        return Publisher.addSubscriber(eventHash, subscriber);
    }

    function removeSubscriber(bytes32 eventHash, address subscriber) public onlyOwner returns (bool) {
        return Publisher.removeSubscriber(eventHash, subscriber);
    }

    /**
     * @dev Create order on order book
     * @notice Reverts when
     * @param params struct CreateOrderParams
     */
    function createOrder(CreateOrderParams memory params) public {
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
        allOrders[nonce].timestamp = now; // solhint-disable-line not-rely-on-time

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
            now // solhint-disable-line not-rely-on-time
        );

//        _addOrderPrice(
//            params.askAssetAddress,
//            params.bidAssetAddress,
//            params.askAssetAmount,
//            params.bidAssetAmount
//        );
    }

    /**
     * @notice Fill order with given params
     * @param params struct FillOrderParams
     */
    function fillOrder(FillOrderParams memory params) public {
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
            _fillOrder(
                params.askAssetAddress,
                params.bidAssetAddress,
                params.nonce,
                msg.sender,
                params.bidAssetAmountToFill
            ),
            "order not filled"
        );
    }

    /**
     * @notice Fill the order with given params. Create new order when
     * `bidAssetAmountToFill` remains after targeted order is filled entirely.
     * @param params struct FillOrderParams
     */
    function fillAndCreateOrder(FillOrderParams memory params) public {
        require(
            _orders[params.bidAssetAddress][params.askAssetAddress].length >
                params.nonce,
            "order not exists"
        );
        Order storage order = _orders[params.bidAssetAddress][params
            .askAssetAddress][params.nonce];

        uint256 filled = order.bidAssetFilledAmount;

        fillOrder(params);

        filled = order.bidAssetFilledAmount - filled;

        // create new order when overfilled
        if (params.bidAssetAmountToFill > filled) {
            uint256 newAskAssetAmount = params.bidAssetAmountToFill - filled;
            uint256 newBidAssetAmount = (newAskAssetAmount *
                order.askAssetAmount) /
                order.bidAssetAmount;

            createOrder(
                CreateOrderParams(
                    order.bidAssetProxyId,
                    order.bidAssetAddress,
                    newAskAssetAmount,
                    order.bidAssetData,
                    order.askAssetProxyId,
                    order.askAssetAddress,
                    newBidAssetAmount,
                    order.askAssetData,
                    0
                )
            );
        }
    }

    /**
     * @notice Fill orders with given params
     * @param params struct FillOrdersParams
     */
    function fillOrders(FillOrdersParams memory params) public {
        require(params.askAssetAddress != address(0), "askAssetAddress is 0");
        require(params.bidAssetAddress != address(0), "bidAssetAddress is 0");

        require(params.nonces.length > 0, "no nonces");
        uint256[] memory nonces = params.nonces;

        require(params.bidAssetAmountToFill > 0, "bidAssetAmountToFill is 0");
        require(
            params.bidAssetAmountToFill <= MAX_AMOUNT,
            "bidAssetAmountToFill exceeded limit"
        );
        uint256 amountToFill = params.bidAssetAmountToFill;

        for (uint256 i = 0; i < nonces.length && amountToFill > 0; i++) {
            require(
                _orders[params.bidAssetAddress][params.askAssetAddress].length >
                    nonces[i],
                "order not exists"
            );
            Order storage order = _orders[params.bidAssetAddress][params
                .askAssetAddress][nonces[i]];

            uint256 before = order.bidAssetFilledAmount;

            if (order.status != OrderStatus.fillable) {
                continue;
            }

            bool result = _fillOrder(
                params.askAssetAddress,
                params.bidAssetAddress,
                order.nonce,
                msg.sender,
                amountToFill
            );

            if (result == false) {
                break;
            }

            uint256 filled = order.bidAssetFilledAmount.sub(before);

            amountToFill = amountToFill.sub(filled);

            if (amountToFill == 0) {
                break;
            }
        }

        require(amountToFill != params.bidAssetAmountToFill, "filled nothing");
    }

    /**
     * @notice Fill orders with given params. Create new order when
     * `bidAssetAmountToFill` remains after targeted orders are filled entirely.
     * @param params struct FillOrdersParams
     */
    function fillAndCreateOrders(FillOrdersParams memory params) public {
        require(params.nonces.length > 0, "no nonces");
        uint256[] memory nonces = params.nonces;

        uint256 i;
        uint256 before;

        for (i = 0; i < nonces.length; i++) {
            before += _orders[params.bidAssetAddress][params
                .askAssetAddress][nonces[i]]
                .bidAssetFilledAmount;
        }

        fillOrders(params);

        uint256 filled;

        for (i = 0; i < nonces.length; i++) {
            filled += _orders[params.bidAssetAddress][params
                .askAssetAddress][nonces[i]]
                .bidAssetFilledAmount;
        }

        filled = filled - before;

        if (params.bidAssetAmountToFill > filled) {
            Order storage firstOrder = _orders[params.bidAssetAddress][params
                .askAssetAddress][nonces[0]];
            uint256 newAskAssetAmount = params.bidAssetAmountToFill - filled;
            uint256 newBidAssetAmount = (newAskAssetAmount *
                firstOrder.askAssetAmount) /
                firstOrder.bidAssetAmount;

            createOrder(
                CreateOrderParams(
                    firstOrder.bidAssetProxyId,
                    firstOrder.bidAssetAddress,
                    newAskAssetAmount,
                    firstOrder.bidAssetData,
                    firstOrder.askAssetProxyId,
                    firstOrder.askAssetAddress,
                    newBidAssetAmount,
                    firstOrder.askAssetData,
                    0
                )
            );
        }
    }

    /**
     * @notice Fill order
     */
    function _fillOrder(
        address askAssetAddress,
        address bidAssetAddress,
        uint256 nonce,
        address taker,
        uint256 bidAssetAmountToFill
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

        uint256 orderFillIndex = _recordOrderFill(order, taker, amountToFill);
//                _recordQuote(askAssetAddress, bidAssetAddress, orderFillIndex);

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

        if (order.status == OrderStatus.filled) {
            // Remove from active list
//                        _removeOrderPrice(
//                            order.askAssetAddress,
//                            order.bidAssetAddress,
//                            order.askAssetAmount,
//                            order.bidAssetAmount
//                        );
        }

        return true;
    }

    /**
     * @dev exchange assets
     * @param maker The maker who made order
     * @param askAssetProxy AssetProxy of Ask
     * @param askAssetAddress Asset(Token) address
     * @param askAssetAmount Amount of asset
     * @param askAssetData Asset data
     * @param taker The taker who fills bid
     * @param bidAssetProxy AssetProxy of Bid
     * @param bidAssetAddress Asset(Token) address
     * @param bidAssetAmount Amount of asset
     * @param bidAssetData Asset Data
     */
    function _exchangeAssets(
        address maker,
        IAssetProxy askAssetProxy,
        address askAssetAddress,
        uint256 askAssetAmount,
        bytes memory askAssetData,
        address taker,
        IAssetProxy bidAssetProxy,
        address bidAssetAddress,
        uint256 bidAssetAmount,
        bytes memory bidAssetData
    ) internal {
        // transfer ask asset to taker from maker
        askAssetProxy.transferFrom(
            maker,
            taker,
            askAssetAmount,
            askAssetAddress,
            askAssetData
        );

        // transfer bid asset to maker from taker
        bidAssetProxy.transferFrom(
            taker,
            maker,
            bidAssetAmount,
            bidAssetAddress,
            bidAssetData
        );
    }

    /**
     * @notice Set order status to `filled` if order is not fillable anymore
     * @param order Struct Order
     */
    function _updateOrderStatus(Order storage order) internal {
        if (order.bidAssetFilledAmount == order.bidAssetAmount) {
            order.status = OrderStatus.filled;
        } else if (
            order.bidAssetAmount > order.askAssetAmount &&
            order
                .bidAssetAmount
                .sub(order.bidAssetFilledAmount)
                .mul(order.askAssetAmount)
                .div(order.bidAssetAmount) <
            1
        ) {
            /// @notice order is not fillable - if next fill cannot take askAsset anymore
            order.status = OrderStatus.filled;
        }
    }

    /**
     * @notice record every fills
     * @param order Struct Order
     * @param taker The address of the taker
     * @param bidAssetAmountToFill The amount to fill to given order
     */
    function _recordOrderFill(
        Order storage order,
        address taker,
        uint256 bidAssetAmountToFill
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
        fills[index].timestamp = now; // solhint-disable-line not-rely-on-time
        fills[index].auxiliary = order.auxiliary;

        emit OrderFilled(
            order.askAssetAddress,
            order.bidAssetAddress,
            order.nonce,
            taker,
            order.bidAssetFilledAmount,
            order.status,
            now // solhint-disable-line not-rely-on-time
        );

        return index;
    }

    /**
     * @dev Cancel Order of given params
     * @param params struct CancelOrderParams
     */
    function cancelOrder(CancelOrderParams memory params) public {
        Order storage o = _orders[params.bidAssetAddress][params
            .askAssetAddress][params.nonce];
        require(o.maker == msg.sender);
        require(o.status != OrderStatus.cancelled, "order already cancelled");
        require(o.status != OrderStatus.filled, "order already filled");

        o.status = OrderStatus.cancelled;

        emit OrderCancelled(
            o.askAssetAddress,
            o.bidAssetAddress,
            o.nonce,
            now // solhint-disable-line not-rely-on-time
        );

//                _removeOrderPrice(
//                    o.askAssetAddress,
//                    o.bidAssetAddress,
//                    o.askAssetAmount,
//                    o.bidAssetAmount
//                );
    }
}
