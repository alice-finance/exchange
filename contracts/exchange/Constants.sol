pragma solidity ^0.5.11;

contract Constants {
    bytes32 public constant SIG_ORDER_CREATED = 0xbd47c557d46a8fa286d10778547accc8ee2803cbaa0b366b093271369cd57275; //keccak256("OrderCreated(uint256,address,bytes4,address,uint256,bytes,bytes4,address,uint256,bytes,uint256)");
    bytes32 public constant SIG_ORDER_FILLED = 0x8bab5121105c1470f66ada0801bfafc6928c682fadc7792d126cde7b9826059c; //keccak256("OrderFilled(nonce,address,address,address,uint256,uint8,uint256)");
    bytes32 public constant SIG_ORDER_CANCELLED = 0xa4bb54ffb7bcc3eb7bdd81e41ad340b367a9b3a7416cd7764e68713a274c9da3; //keccak256("OrderCancelled(uint256,address,address,uint256)");

    uint256 public constant MAX_AMOUNT = 2 ** 128 - 1;
}
