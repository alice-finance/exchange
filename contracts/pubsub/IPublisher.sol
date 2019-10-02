pragma solidity ^0.5.11;

interface IPublisher {
    function addSubscriber(bytes32 eventHash, address subscriber) external;
    function removeSubscriber(bytes32 eventHash, address subscriber) external;
    function isSubscriber(bytes32 eventHash, address subscriber) external;
}
