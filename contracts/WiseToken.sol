pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Mintable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Pausable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol"; 
import "openzeppelin-solidity/contracts/ownership/Ownable.sol"; 

contract WiseToken is  ERC20, ERC20Detailed, ERC20Mintable, ERC20Pausable, Ownable{
    constructor () public ERC20Detailed("JAMESJARA45", "J45", 18) {
    }
}