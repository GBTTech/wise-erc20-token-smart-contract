pragma solidity ^0.5.0;
 
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Mintable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/TokenTimelock.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Pausable.sol";
import "openzeppelin-solidity/contracts/crowdsale/Crowdsale.sol";
import "openzeppelin-solidity/contracts/crowdsale/emission/MintedCrowdsale.sol";
import "openzeppelin-solidity/contracts/crowdsale/validation/CappedCrowdsale.sol";
import "openzeppelin-solidity/contracts/crowdsale/validation/TimedCrowdsale.sol"; 
import "openzeppelin-solidity/contracts/crowdsale/distribution/RefundablePostDeliveryCrowdsale.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

contract WiseTokenCrowdsale is Crowdsale, MintedCrowdsale, CappedCrowdsale, TimedCrowdsale, RefundablePostDeliveryCrowdsale, Ownable {
  /*
                    WSE             USD         TR-USD  TOKEN-RATE        STRATEGY
  ETH PRICE: $150
  TOTAL SUPPLY: 100 000 000       100 000 0000     

  AIR-DROPED     5 000 000 (5%)                 $10                       MINTED
  ADVISORS       4 000 000 (4%)                 $10                       MINTED
  TEAM           7 000 000 (7%)                 $10                       MINTED
  BUSINESS      30 000 000 (30%)                $10                       MINTED
  RESERVER      20 000 000 (20%)                $10                       MINTED

  PRIVATE       20 000 000 (20%)  60 000 000    $3       50               MANUAL/BUY
  PRE           10 000 000 (10%)  50 000 000    $5       20               MANUAL/BUY
  PUBLIC         5 000 000 (5%)   40 000 000    $8       19               BUY
  */

  // Events
  event EthTransferred(string text);
  event EthRefunded(string text);

  // Crowdsale
  enum CrowdsaleStage { PrivateICO, PreICO, ICO }
  CrowdsaleStage public stage = CrowdsaleStage.PrivateICO;
  uint256 private _wserate;

  // Token Distribution
  uint256 public totalTokens                = 100000000;
  uint256 public crowdsaleFundDistribution  = 35;
  uint256 public airdroppedFundDistribution = 5;
  uint256 public advisorsFundDistribution   = 3;
  uint256 public teamFundDistribution       = 7;
  uint256 public bussinesFundDistribution   = 30;
  uint256 public reserveFundDistribution    = 20;
  uint256 public privateFundDistribution    = 20;
  uint256 public preFundDistribution        = 10;
  uint256 public publicFundDistribution     = 5;

  // Token funds
  address public crowdsaleFund;
  address public airdroppedFund;
  address public advisorsFund;
  address public teamFund;
  address public bussinesFund;
  address public reserveFund;

  // Tracking tokens
  uint256 public totalPrivateTokens = 0;
  uint256 public totalPreTokens     = 0;
  uint256 public totalPublicTokens  = 0;

  constructor(
    uint256 _rate,
    address payable _wallet,
    ERC20Mintable _token,
    uint256 _cap,
    uint256 _goal,
    address[] memory _fundAddresses,
    uint256 _openingTime,
    uint256 _closingTime
  )
    Crowdsale(_rate, _wallet, _token)
    CappedCrowdsale(_cap)
    TimedCrowdsale(_openingTime, _closingTime)
    RefundableCrowdsale(_goal)
    public
  {
    require(_goal <= _cap);
    _wserate = _rate;
    airdroppedFund  = _fundAddresses[0];
    advisorsFund    = _fundAddresses[1];
    teamFund        = _fundAddresses[2];
    bussinesFund    = _fundAddresses[3];
    reserveFund     = _fundAddresses[4];
  }
 
  /**
    * @dev Change the current rate
    * @param _rate rate
  */
  function setCurrentRate(uint256 _rate) onlyOwner public {
      _wserate = _rate;
  }
 
  /**
  * @dev Allows admin to update the crowdsale stage
  * @param _stage Crowdsale stage
  */
  function setCrowdsaleStage(uint _stage, uint256 _rate) onlyOwner public {
    if(uint(CrowdsaleStage.PrivateICO) == _stage) {
      stage = CrowdsaleStage.PrivateICO;
    } else if (uint(CrowdsaleStage.PreICO) == _stage) {
      stage = CrowdsaleStage.PreICO;
    } else if (uint(CrowdsaleStage.ICO) == _stage) {
      stage = CrowdsaleStage.ICO;
    }
    // ETH-PRICE / TOKEN-USD-PRICE
    setCurrentRate(_rate);
  }

  /**
    * @dev Update current tokens total stack by stage
    * @param _tokens new tokens
    */
  function updateTokensQuantity(uint256 _tokens) internal {
    if(stage == CrowdsaleStage.PrivateICO) {
      totalPrivateTokens = totalPrivateTokens.add(_tokens); 
    } else if (stage == CrowdsaleStage.PreICO) {
      totalPreTokens = totalPreTokens.add(_tokens);
    } else if (stage == CrowdsaleStage.ICO) {
      totalPublicTokens = totalPublicTokens.add(_tokens);
    } 
  }
     
  /**
    * @dev Returns the rate of tokens per wei at the present time.
    * @return The number of tokens a buyer gets per wei at a given time
    */
  function getCurrentRate() public view returns (uint256) {
      return _wserate;
  }
  
  /**
    * The base rate function is overridden to revert, since this crowdsale doens't use it, and
    * all calls to it are a mistake.
    */
  function rate() public view returns (uint256) {
      return getCurrentRate();
  }

  /**
    * @dev Overrides parent method taking into account variable rate.
    * @param weiAmount The value in wei to be converted into tokens
    * @return The number of tokens _weiAmount wei will buy at present time
    */
  function _getTokenAmount(uint256 weiAmount) internal view returns (uint256) {
      uint256 currentRate = getCurrentRate();
      return currentRate.mul(weiAmount);
  }

  /**
  * @dev Extend parent behavior verifing the limits of each stage
  * @param _beneficiary Token purchaser
  * @param _weiAmount Amount of wei contributed
  */
  function _preValidatePurchase( address payable _beneficiary, uint256 _weiAmount ) internal {
    super._preValidatePurchase(_beneficiary, _weiAmount );
    require(_validateTokenLimits(_getTokenAmountSimple(_weiAmount)));
  }

  /**
    * @dev validates the tokens limit of Private and Public stages
    * @param tokens new tokens
    * @return if it is posible to continue or has reached the limits
    */
  function _validateTokenLimits(uint256 tokens) internal returns (bool) {
      if(stage == CrowdsaleStage.PrivateICO) { 
        require(totalPrivateTokens.add(tokens)  <= privateFundDistribution.mul(10**6));
      } else if (stage == CrowdsaleStage.PreICO) {
        require(totalPreTokens.add(tokens)      <= preFundDistribution.mul(10**6));
      } else if (stage == CrowdsaleStage.ICO) { 
        // Public ICO doesn't have any tokens limits,
        // however will be limited by the cap contract;
        // and the cap will be on ETH rather than tokens.
      }
      return true;
  }

  /**
    * @dev Utility method to convert wei to tokens
    * @param weiAmount Value in wei to be converted into tokens
    * @return Number of tokens that can be purchased with the specified _weiAmount
    */
  function _getTokenAmountSimple(uint256 weiAmount) internal view returns (uint256) {
    return _getTokenAmount(weiAmount).div(10**18);
  } 
 
  /**
    * @dev Override for extensions that require an internal state to check for validity (current user contributions, etc.)
    * @param beneficiary Address receiving the tokens
    * @param weiAmount Value in wei involved in the purchase
  */
  function _updatePurchasingState(address beneficiary, uint256 weiAmount) internal {
    updateTokensQuantity(_getTokenAmountSimple(weiAmount)); 
  }

  /**
    * @dev forwards funds to the wallet during the PrivateICO/PreICO stage, 
    * then the refund vault during ICO stage using the RefundablePostDeliveryCrowdsale
  */
  function _forwardFunds() internal {
    if(stage == CrowdsaleStage.PrivateICO) {
      address(wallet()).transfer(msg.value);
      // emit EthTransferred("forwarding funds to wallet PrivateICO");
    } else if (stage == CrowdsaleStage.PreICO) {
      address(wallet()).transfer(msg.value);
      // emit EthTransferred("forwarding funds to wallet PreICO");
    } else if (stage == CrowdsaleStage.ICO) {
      // emit EthTransferred("forwarding funds to refundable vault");
      super._forwardFunds();
    }
  }
   
  /**
    * @dev Allocates tokens for investors that contributed. These include
    * whitelisted investors and investors paying with usd
    * mode mint/manual
    * @param _beneficiary Token purchaser
    * @param _tokens Number of tokens
  */
  function mintTokensInvestors(address _beneficiary, uint256 _tokens) onlyOwner public {
      uint tokensInWei = _tokens.mul(10**18);
      require(_beneficiary != address(0));
      require(_tokens > 0);
      require(_validateTokenLimits(_tokens));
      require(ERC20Mintable(address(token())).mint(_beneficiary, tokensInWei));
      updateTokensQuantity(_tokens);
  }

  /**
    * @dev Allocates tokens for each group
    * Requires mintin role
    * mode: mint/manual
  */
  function mintFullTeam() internal {
    if(goalReached()) {
      ERC20Mintable _mintableToken = ERC20Mintable(address(token()));
      _mintableToken.mint(address(airdroppedFund),  airdroppedFundDistribution  * (10**6) * 10**18);
      _mintableToken.mint(address(advisorsFund),    advisorsFundDistribution    * (10**6) * 10**18);
      _mintableToken.mint(address(teamFund),        teamFundDistribution        * (10**6) * 10**18);
      _mintableToken.mint(address(bussinesFund),    bussinesFundDistribution    * (10**6) * 10**18);
      _mintableToken.mint(address(reserveFund),     reserveFundDistribution     * (10**6) * 10**18);
    }
  }
 
  /**
    * @dev called when owner calls finalize(), calls mintFullTeam()
    * Requires mintin role
  */
  function _finalization() internal { 
    if(goalReached()) { 
      mintFullTeam();
    }
    super._finalization();
  } 

}
