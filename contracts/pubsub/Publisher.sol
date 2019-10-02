pragma solidity ^0.5.11;

import "./IPublisher.sol";

contract Publisher is IPublisher {
    function addSubscriber(bytes32 eventHash, address subscriber) public {

    }

    function removeSubscriber(bytes32 eventHash, address subscriber) public {

    }

    function isSubscriber(bytes32 eventHash, address subscriber) public {

    }

    function _publishEvent(bytes32 eventHash, bytes memory data) internal {

    }
}
