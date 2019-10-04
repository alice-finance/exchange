pragma solidity ^0.5.11;

interface IPublisher {
    function addSubscriber(bytes32 eventHash, address subscriber)
        external
        returns (bool);
    function removeSubscriber(bytes32 eventHash, address subscriber)
        external
        returns (bool);
    function isSubscriber(bytes32 eventHash, address subscriber)
        external
        view
        returns (bool);
}
