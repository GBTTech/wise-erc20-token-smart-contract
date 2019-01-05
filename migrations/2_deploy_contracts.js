
const WiseToken = artifacts.require("./WiseToken.sol");
const WiseTokenCrowdsale = artifacts.require("./WiseTokenCrowdsale.sol");

const ether = (n) => new web3.BigNumber(web3.toWei(n, 'ether'));

const duration = {
  seconds: function (val) { return val; },
  minutes: function (val) { return val * this.seconds(60); },
  hours: function (val) { return val * this.minutes(60); },
  days: function (val) { return val * this.hours(24); },
  weeks: function (val) { return val * this.days(7); },
  years: function (val) { return val * this.days(365); },
};

module.exports =   function(deployer, network, accounts) {
  const _name = "jamesjara2";
  const _symbol = "jjj2";
  const _decimals = 18;
 
  const latestTime = (new Date).getTime();

  // NOTE: For deployment changes the variables

  const _rate           = 1;  // 1 ETH can buy 1 tokens
  const _wallet         = '';
  const _openingTime    = (latestTime/1000) + duration.minutes(1);
  const _closingTime    = _openingTime +  duration.minutes(20); //duration.weeks(1);
  const _cap            = ether(30);
  const _goal           = ether(15);
  const _foundersFund   = '';
  const _foundationFund = '';
  const _partnersFund   = '';
  const _releaseTime    = _closingTime +  duration.minutes(10);  //+ duration.days(1);

  deployer.then(async() => {
    await deployer.deploy(WiseToken, _name, _symbol, _decimals);
    
    const _deployedToken = await WiseToken.deployed();

    const result = await deployer.deploy(
      WiseTokenCrowdsale,
      _rate,
      _wallet,
      _deployedToken.address,
      _cap,
      _openingTime,
      _closingTime,
      _goal,
      _foundersFund,
      _foundationFund,
      _partnersFund,
      _releaseTime
    );

    console.log(result)
  });

  return true;

};