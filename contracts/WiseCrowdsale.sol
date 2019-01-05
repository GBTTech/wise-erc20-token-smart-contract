pragma solidity 0.4.24;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/PausableToken.sol";
import "openzeppelin-solidity/contracts/token/ERC20/MintableToken.sol";
import "openzeppelin-solidity/contracts/token/ERC20/TokenTimelock.sol";
import "openzeppelin-solidity/contracts/crowdsale/Crowdsale.sol";
import "openzeppelin-solidity/contracts/crowdsale/emission/MintedCrowdsale.sol";
import "openzeppelin-solidity/contracts/crowdsale/validation/CappedCrowdsale.sol";
import "openzeppelin-solidity/contracts/crowdsale/validation/TimedCrowdsale.sol";
import "openzeppelin-solidity/contracts/crowdsale/validation/WhitelistedCrowdsale.sol";
import "openzeppelin-solidity/contracts/crowdsale/distribution/RefundableCrowdsale.sol";

contract WiseTokenCrowdsale is Crowdsale, MintedCrowdsale, CappedCrowdsale, TimedCrowdsale, RefundableCrowdsale {
  
  /*

  DEVELOPER NOTES

  // GOAL:    100,000,000 TOKENS
  // WEI:     100,000,00  PER 1 ETH
  // MIN-CAP: 100,000,00
  // MAX-CAP: 500,000,00

  ///////////////
  // REAL CASE //
  ///////////////

  // ETH PRICE 139 1/1/19 
  // EXPECTED WISE TOKEN PRICE: 10 USD
  // WISE TOKEN: 10 USD (ETH * 10): 1390 ETH
  // WISE TOKEN IS 0.00011976047904191617
  // $10 / 139 = 0.07194244604316546
  // 10(^18) * 0.071520526391074 = 715205263910.74
  // 715205263910.74 / 10(^18)
  // WEI:     138.888888888888889
  
  */

  // Events
  event EthTransferred(string text);
  event EthRefunded(string text);

  // Crowdsale Stages
  enum CrowdsaleStage { PrivateICO, PreICO, ICO }

  // Default to presale stage
  CrowdsaleStage public stage = CrowdsaleStage.PrivateICO;

  // Token Distribution
  uint256 public tokenSalePercentage   = 70;
  uint256 public foundersPercentage    = 10;
  uint256 public foundationPercentage  = 10;
  uint256 public partnersPercentage    = 10;

  // Token reserve funds
  address public foundersFund;
  address public foundationFund;
  address public partnersFund;

  // Token time lock
  uint256 public releaseTime;
  address public foundersTimelock;
  address public foundationTimelock;
  address public partnersTimelock;
  
  // Track investor contributions
  uint256 public investorMinCap = 1000000000000000000;
  uint256 public investorHardCap= 5000000000000000000;
  mapping(address => uint256) public contributions;

  constructor(
    uint256 _rate,
    address _wallet,
    ERC20 _token,
    uint256 _cap,
    uint256 _openingTime,
    uint256 _closingTime,
    uint256 _goal,
    address _foundersFund,
    address _foundationFund,
    address _partnersFund,
    uint256 _releaseTime
  )
    Crowdsale(_rate, _wallet, _token)
    CappedCrowdsale(_cap)
    TimedCrowdsale(_openingTime, _closingTime)
    RefundableCrowdsale(_goal)
    public
  {
    require(_goal <= _cap);
    foundersFund   = _foundersFund;
    foundationFund = _foundationFund;
    partnersFund   = _partnersFund;
    releaseTime    = _releaseTime;
  }

  /**
  * @dev Returns the amount contributed so far by a sepecific user.
  * @param _beneficiary Address of contributor
  * @return User contribution so far
  */
  function getUserContribution(address _beneficiary)
    public view returns (uint256)
  {
    return contributions[_beneficiary];
  }

  /**
  * @dev Allows admin to update the crowdsale stage
  * @param _stage Crowdsale stage
  */
  function setCrowdsaleStage(uint _stage) public onlyOwner {
    if(uint(CrowdsaleStage.PrivateICO) == _stage) {
      stage = CrowdsaleStage.PrivateICO;
    } else if (uint(CrowdsaleStage.PreICO) == _stage) {
      stage = CrowdsaleStage.PreICO;
    } else if (uint(CrowdsaleStage.ICO) == _stage) {
      stage = CrowdsaleStage.ICO;
    }

    if(stage == CrowdsaleStage.PrivateICO) {
       // 1 ETH can buy 5 tokens
      setCurrentRate(5);
    } else if (stage == CrowdsaleStage.PreICO) {
       // 1 ETH can buy 3 tokens
      setCurrentRate(3);
    } else if (stage == CrowdsaleStage.ICO) {
       // 1 ETH can buy 1 tokens
      setCurrentRate(1);
    }
  }

  /**
   * @dev Change the current rate
  */
  function setCurrentRate(uint256 _rate) private {
      rate = _rate;
  }

  /**
   * @dev forwards funds to the wallet during the PrivateICO/PreICO stage, then the refund vault during ICO stage
   */
  function _forwardFunds() internal {
    if(stage == CrowdsaleStage.PrivateICO) {
      wallet.transfer(msg.value);
            emit EthTransferred("forwarding funds to wallet PrivateICO");
    } else if (stage == CrowdsaleStage.PreICO) {
      wallet.transfer(msg.value);
            emit EthTransferred("forwarding funds to wallet PreICO");
    } else if (stage == CrowdsaleStage.ICO) {
            emit EthTransferred("forwarding funds to refundable vault");
      super._forwardFunds();
    }
  }

  /**
  * @dev Extend parent behavior requiring purchase to respect investor min/max funding cap.
  * @param _beneficiary Token purchaser
  * @param _weiAmount Amount of wei contributed
  */
  function _preValidatePurchase(
    address _beneficiary,
    uint256 _weiAmount
  )
    internal
  {
    super._preValidatePurchase(_beneficiary, _weiAmount);
    uint256 _existingContribution = contributions[_beneficiary];
    uint256 _newContribution = _existingContribution.add(_weiAmount);
    require(_newContribution >= investorMinCap && _newContribution <= investorHardCap);
    contributions[_beneficiary] = _newContribution;
  }

  /**
   * @dev enables token transfers, called when owner calls finalize()
  */
  function finalization() internal {
    if(goalReached()) {
      MintableToken _mintableToken = MintableToken(token);
      uint256 _alreadyMinted = _mintableToken.totalSupply();

      uint256 _finalTotalSupply = _alreadyMinted.div(tokenSalePercentage).mul(100);

      foundersTimelock   = new TokenTimelock(token, foundersFund, releaseTime);
      foundationTimelock = new TokenTimelock(token, foundationFund, releaseTime);
      partnersTimelock   = new TokenTimelock(token, partnersFund, releaseTime);

      _mintableToken.mint(address(foundersTimelock),   _finalTotalSupply.mul(foundersPercentage).div(100));
      _mintableToken.mint(address(foundationTimelock), _finalTotalSupply.mul(foundationPercentage).div(100));
      _mintableToken.mint(address(partnersTimelock),   _finalTotalSupply.mul(partnersPercentage).div(100));

      _mintableToken.finishMinting();
      // Unpause the token
      PausableToken _pausableToken = PausableToken(token);
      _pausableToken.unpause();
      _pausableToken.transferOwnership(wallet);
    }

    super.finalization();
  } 

}