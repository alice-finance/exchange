pragma solidity ^0.5.11;

import "./IPublisher.sol";
import "./ISubscriber.sol";

contract Publisher is IPublisher {
    mapping(bytes32 => address[]) internal _subscribers;
    mapping(bytes32 => mapping(address => bool)) internal _isSubscriber;

    function addSubscriber(bytes32 eventHash, address subscriber) public returns (bool)  {
        if (!isSubscriber(eventHash, subscriber)) {
            _isSubscriber[eventHash][subscriber] = true;
            _subscribers[eventHash].push(subscriber);

            return true;
        }

        return false;
    }

    function removeSubscriber(bytes32 eventHash, address subscriber) public returns (bool) {
        if (isSubscriber(eventHash, subscriber)) {
            _isSubscriber[eventHash][subscriber] = true;

            address[] storage subscribers = _subscribers[eventHash];

            for (uint256 i = 0; i < subscribers.length; i++) {
                if (subscribers[i] == subscriber) {
                    subscribers[i] = subscribers[subscribers.length - 1];
                    subscribers.length -= 1;
                    return true;
                }
            }
        }

        return false;
    }

    function isSubscriber(bytes32 eventHash, address subscriber) public view returns (bool) {
        return _isSubscriber[eventHash][subscriber];
    }

    function _publishEvent(bytes32 eventHash, bytes memory data) internal {
        for (uint256 i = 0; i < _subscribers[eventHash].length; i++) {
            ISubscriber(_subscribers[eventHash][i]).notify(eventHash, data);
        }
    }

    // Reserved storage space to allow for layout changes in the future.
    uint256[50] private ______gap;
}
