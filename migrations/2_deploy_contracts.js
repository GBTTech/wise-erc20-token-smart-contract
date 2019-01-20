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
  const _wallet = '0x2dE3a9ebb1E1095185777cf5b18FdFCd14565907';
  const _cap = ether(100);
  const _goal = ether(1);
  const _fundAddresses = [
    '0xA69CBa3E8c53C2273007C0988Ef07d7a846A7869',
    '0xA69CBa3E8c53C2273007C0988Ef07d7a846A7869',
    '0xA69CBa3E8c53C2273007C0988Ef07d7a846A7869',
    '0xA69CBa3E8c53C2273007C0988Ef07d7a846A7869',
    '0xA69CBa3E8c53C2273007C0988Ef07d7a846A7869',
  ];
  const _openingTime = latestTime + duration.minutes(1); // latestTime + duration.minutes(1);
  const _closingTime = _openingTime + duration.minutes(30); // duration.weeks(1);

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
