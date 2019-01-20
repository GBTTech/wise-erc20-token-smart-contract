const WiseToken = artifacts.require('./WiseToken.sol');
const WiseTokenCrowdsale = artifacts.require('./WiseTokenCrowdsale.sol');
const ether = (n) => web3.utils.toWei(String(n), 'ether');

const duration = {
  seconds: function (val) { return val; },
  minutes: function (val) { return val * this.seconds(60); },
  hours: function (val) { return val * this.minutes(60); },
  days: function (val) { return val * this.hours(24); },
  weeks: function (val) { return val * this.days(7); },
  years: function (val) { return val * this.days(365); },
};

module.exports = function (deployer, network, accounts) {
  const latestTime = Math.floor(Date.now() / 1000);

  const _rate = 1; // 1 wei can buy 1 tokens
  const _wallet = '0xc4c1e2C6cbF660FfFba769c8eA6cF507a34581D6';
  const _cap = ether(186620);
  const _goal = ether(69980);
  const _fundAddresses = [
    '0xE38F5BC404818b45c669f8B9226C178B739ea804',
    '0xd10d38aea7cEf015709473185125e68835754E9b',
    '0x402a8a711F30BCc8d5D9326Eeb23A083349272e1',
    '0x45DdB78D64024D544BA2cDDf2132A4b78188E3d8',
    '0x1bB370F547c74E6ae0F313D035d5b1D7A78557bC',
  ];
  const _openingTime = latestTime + duration.minutes(1); // latestTime + duration.minutes(1);
  const _closingTime = 1569718861; //_openingTime + duration.minutes(30); // duration.weeks(1);

  let tokenInstance,
    wiseCrowdsaleInstance;

  return deployer.deploy(WiseToken)
    .then(function () {
      return WiseToken.deployed();
    })
    .then(function (_instance) {
      tokenInstance = _instance;
      return deployer.deploy(
        WiseTokenCrowdsale,
        _rate,
        _wallet,
        tokenInstance.address,
        _cap,
        _goal,
        _fundAddresses,
        _openingTime,
        _closingTime
      );
    })
    .then(function () {
      return WiseTokenCrowdsale.deployed();
    })
    .then(function (_instance) {
      wiseCrowdsaleInstance = _instance;
    })
    .then(function () {
      console.log(wiseCrowdsaleInstance.address);
      tokenInstance.transferOwnership(wiseCrowdsaleInstance.address);
      tokenInstance.addMinter(wiseCrowdsaleInstance.address);
      wiseCrowdsaleInstance.setCrowdsaleStage(0);
      wiseCrowdsaleInstance.setCurrentRate(23, 15);
    });
};
