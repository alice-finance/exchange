pragma solidity ^0.5.3;

import "openzeppelin-solidity/contracts/token/ERC721/ERC721Mintable.sol";
import "openzeppelin-solidity/contracts/token/ERC721/ERC721Metadata.sol";


contract ERC721Mock is ERC721Mintable, ERC721Metadata {
    constructor(string memory name, string memory symbol)
    public ERC721Metadata(name, symbol) {}
}
