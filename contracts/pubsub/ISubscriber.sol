pragma solidity ^0.5.11;


interface ISubscriber {
    function notify(bytes32 eventHash, bytes calldata data) external;
}
