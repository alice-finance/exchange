pragma solidity ^0.5.11;

interface ISubscriber {
    function isSubscriber() external view returns (bool);
    function notify(bytes32 eventHash, bytes calldata data)
        external
        returns (bool);
}
