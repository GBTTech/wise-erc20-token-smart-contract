const { BN, balance, ether, should, shouldFail, time } = require('openzeppelin-test-helpers');

const WiseToken = artifacts.require('./WiseToken.sol');
const WiseTokenCrowdsale = artifacts.require('./WiseTokenCrowdsale.sol');

contract('WiseTokenCrowdsale', function ([ _, deployer, owner, wallet, investor, investor2, investor3, investor4, foundersFund ]) {
  const RATE = new BN(1);
  const GOAL = ether('10');
  const CAP = ether('20');

  before(async function () {
    // Advance to the next block to correctly read time in the solidity "now" function interpreted by ganache
    await time.advanceBlock();
  });

  beforeEach(async function () {
    this.openingTime = (await time.latest()).add(time.duration.weeks(1));
    this.closingTime = this.openingTime.add(time.duration.weeks(1));
    this.afterClosingTime = this.closingTime.add(time.duration.seconds(1));

    // Team
    this._fundAddresses = [foundersFund];

    // Deploy Token
    this.token = await WiseToken.new({ from: _ });

    // Deploy Crowdsale
    this.crowdsale = await WiseTokenCrowdsale.new(
      RATE,
      wallet,
      this.token.address,
      CAP,
      GOAL,
      this._fundAddresses,
      this.openingTime,
      this.closingTime,
      { from: _ }
    );

    await this.token.transferOwnership(this.crowdsale.address, { from: _ });
    await this.token.addMinter(this.crowdsale.address, { from: _ });
    await this.crowdsale.setCrowdsaleStage(0, RATE, { from: _ } ); 
  });
  
  describe('crowdsale', function () {
    it('should create crowdsale with correct parameters', async function () {
      should.exist(this.crowdsale);
      should.exist(this.token);
      (await this.crowdsale.openingTime()).should.be.bignumber.equal(this.openingTime);
      (await this.crowdsale.closingTime()).should.be.bignumber.equal(this.closingTime);
      (await this.crowdsale.rate()).should.be.bignumber.equal(RATE);
      (await this.crowdsale.wallet()).should.be.equal(wallet);
      (await this.crowdsale.goal()).should.be.bignumber.equal(GOAL);
      (await this.crowdsale.cap()).should.be.bignumber.equal(CAP);
    });

    it('should not accept payments before start', async function () {
      await shouldFail.reverting(this.crowdsale.send(ether('1')));
      await shouldFail.reverting(this.crowdsale.buyTokens(investor, { from: investor, value: ether('1') }));
    });

    it('should revert payments with buyTokens as we dont have initial supply', async function () {
      await shouldFail.reverting(this.crowdsale.buyTokens(investor, { from: investor, value: ether('1') }));
    });
  });

  describe('Private Sale', async function () {
    it('should change stage and rate to private', async function () {
      await this.crowdsale.setCrowdsaleStage(0, 1, { from: _ });
      const stage = await this.crowdsale.stage();
      stage.should.be.bignumber.equal(new BN(0));
    });

    it('should accept mint tokens investor', async function () {
      await this.crowdsale.setCrowdsaleStage(0, 1, { from: _ });
      await this.crowdsale.mintTokensInvestors(investor3, 1, { from: _ });
      (await this.token.balanceOf(investor3)).should.be.bignumber.equal(new BN('1000000000000000000'));
    });

    it('should accept eth payments', async function () {
      await time.increaseTo(this.openingTime);
      const expectedTokenAmount =  ether('5');
      await this.crowdsale.setCrowdsaleStage(0, 1, { from: _ });
      await web3.eth.sendTransaction({ value: expectedTokenAmount, from: investor4 , to: this.crowdsale.address , gas: 4712388 });
      (await this.crowdsale.balanceOf(investor4)).should.be.bignumber.equal(expectedTokenAmount);
    });

    it('should reject if hit stage tokens cap of 20000000 tokens', async function () { 
      const expectedTokenAmount =  new BN('5');
      const totalPrivateTokensLimit =  new BN('20000000');
      await this.crowdsale.setCrowdsaleStage(0, 1, { from: _ });
      await this.crowdsale.mintTokensInvestors(investor3, expectedTokenAmount, { from: _ });
      await shouldFail.reverting(this.crowdsale.mintTokensInvestors(investor3, totalPrivateTokensLimit, { from: _ }));
    });
  });

  describe('Pre Sale', async function () {
    it('should change stage and rate to presale', async function () {
      await this.crowdsale.setCrowdsaleStage(1, 1, { from: _ });
      const stage = await this.crowdsale.stage();
      stage.should.be.bignumber.equal(new BN(1));
    });

    it('should accept mint tokens investor', async function () {
      await this.crowdsale.setCrowdsaleStage(1, 1, { from: _ });
      await this.crowdsale.mintTokensInvestors(investor3, 1, { from: _ });
      (await this.token.balanceOf(investor3)).should.be.bignumber.equal(new BN('1000000000000000000'));
    });

    it('should accept eth payments', async function () {
      await time.increaseTo(this.openingTime);
      const expectedTokenAmount =  ether('5');
      await this.crowdsale.setCrowdsaleStage(1, 1, { from: _ });
      await web3.eth.sendTransaction({ value: expectedTokenAmount, from: investor4 , to: this.crowdsale.address , gas: 4712388 });
      (await this.crowdsale.balanceOf(investor4)).should.be.bignumber.equal(expectedTokenAmount);
    });

    it('should reject if hit stage tokens cap of 10000000 tokens', async function () { 
      const expectedTokenAmount =  new BN('1');
      const totalPreTokensLimit =  new BN('10000000');
      await this.crowdsale.setCrowdsaleStage(1, 1, { from: _ });
      await this.crowdsale.mintTokensInvestors(investor3, expectedTokenAmount, { from: _ }); ;
      await shouldFail.reverting(this.crowdsale.mintTokensInvestors(investor3, totalPreTokensLimit, { from: _ }));
    });
  });


  describe('Public Sale', async function () {
    it('should change stage and rate to public', async function () {
      await this.crowdsale.setCrowdsaleStage(2, 1, { from: _ });
      const stage = await this.crowdsale.stage();
      stage.should.be.bignumber.equal(new BN(2));
    });

    it('should accept mint tokens investor', async function () {
      await this.crowdsale.setCrowdsaleStage(2, 1, { from: _ });
      await this.crowdsale.mintTokensInvestors(investor3, 1, { from: _ });
      (await this.token.balanceOf(investor3)).should.be.bignumber.equal(new BN('1000000000000000000'));
    });

    it('should accept eth payments', async function () {
      await time.increaseTo(this.openingTime);
      const expectedTokenAmount =  ether('5');
      await this.crowdsale.setCrowdsaleStage(2, 1, { from: _ });
      await web3.eth.sendTransaction({ value: expectedTokenAmount, from: investor4 , to: this.crowdsale.address , gas: 4712388 });
      (await this.crowdsale.balanceOf(investor4)).should.be.bignumber.equal(expectedTokenAmount);
    });

  });

  describe('Specific methods', async function () {

    it('setCurrentRate', async function () {
      const trate = new BN(5);
      await this.crowdsale.setCurrentRate(trate, { from: _ });
      const rate = await this.crowdsale.rate();
      rate.should.be.bignumber.equal(trate);
    });

    it('setCurrentRate non-owner',  async function () { 
      await shouldFail.reverting(this.crowdsale.setCurrentRate(new BN(5), { from: investor2 }));
    });

    it('setCrowdsaleStage', async function () {
      const stageId = new BN('0');
      await this.crowdsale.setCrowdsaleStage(0, RATE, { from: _ });
      const stage = await this.crowdsale.stage();
      stageId.should.be.bignumber.equal(new BN(stage));
    });

    it('setCrowdsaleStage non-owner', async function () { 
      await shouldFail.reverting(this.crowdsale.setCrowdsaleStage(0, RATE, { from: investor2 }));
    });

    it('mintTokensInvestors', async function () {
      // @TODO
    });

    it('mintTokensInvestors non-owner', async function () {
      await shouldFail.reverting(this.crowdsale.mintTokensInvestors(investor3, 111, { from: investor3 }));
    });

    it('mintFullTeam', async function () {
      // @TODO: validate how to track token once get 
    });

    it('mintFullTeam non-owner', async function () {
      // @TODO: validate how to track token once get 
    });

    it('mintFullTeam cap is reached', async function () {
      // @TODO: validate how to track token once get 
    });
 
  });

  describe('Crowdsale stages', async function () {

    it('change to private stage', async function () {
      const stageId = new BN('0');
      await this.crowdsale.setCrowdsaleStage(stageId, RATE, { from: _ });
      const stage = await this.crowdsale.stage();
      stageId.should.be.bignumber.equal(new BN(stage));
    });
    it('change to pre stage', async function () {
      const stageId = new BN('1');
      await this.crowdsale.setCrowdsaleStage(stageId, RATE, { from: _ });
      const stage = await this.crowdsale.stage();
      stageId.should.be.bignumber.equal(new BN(stage));
    });
    it('change to public stage', async function () {
      const stageId = new BN('2');
      await this.crowdsale.setCrowdsaleStage(stageId, RATE, { from: _ });
      const stage = await this.crowdsale.stage();
      stageId.should.be.bignumber.equal(new BN(stage));
      await this.crowdsale.setCrowdsaleStage(0, RATE, { from: _ });
    });

    it('prevents non-admin from updating the stage', async function () {
      await shouldFail.reverting(this.crowdsale.setCrowdsaleStage(0, RATE, { from: investor }));
    });
  });

  describe('CappedCrowdsale', async function () {

    it('Should reject payments over cap', async function () {
      await time.increaseTo(this.openingTime);
      await this.crowdsale.sendTransaction({ value: CAP, from: investor, gasPrice: 0 });
      await shouldFail.reverting(this.crowdsale.sendTransaction({ value: ether('1'), from: investor, gasPrice: 0 }));
    });

    it('should allow finalization and transfer funds to wallet if the goal is reached', async function () {
      await time.increaseTo(this.openingTime);
      await this.crowdsale.sendTransaction({ value: GOAL, from: investor, gasPrice: 0 });
      await time.increaseTo(this.afterClosingTime);
      await this.crowdsale.finalize({ from: owner });
    });

    it('should allow refunds if the goal is not reached', async function () {
      (await balance.difference(investor2, async () => {
        await time.increaseTo(this.openingTime);
        await this.crowdsale.setCrowdsaleStage(2, RATE);
        await this.crowdsale.sendTransaction({ value: ether('1'), from: investor2, gasPrice: 0 });
        await time.increaseTo(this.afterClosingTime);
        await this.crowdsale.finalize({ from: owner });
        await this.crowdsale.claimRefund(investor2, { gasPrice: 0 });
        await this.crowdsale.setCrowdsaleStage(0, RATE);
      })).should.be.bignumber.equal('0');
    });
  });

  describe('token distribution', function() {
    it('tracks token distribution correctly', async function () {
      const crowdsaleFundDistribution  = new BN('35');
      const airdroppedFundDistribution = new BN('5');
      const advisorsFundDistribution   = new BN('3');
      const teamFundDistribution       = new BN('7');
      const bussinesFundDistribution   = new BN('30');
      const reserveFundDistribution    = new BN('20');
      const privateFundDistribution    = new BN('20');
      const preFundDistribution        = new BN('10');
      const publicFundDistribution     = new BN('5');
      crowdsaleFundDistribution.should.be.bignumber.eq(await this.crowdsale.crowdsaleFundDistribution()); 
      airdroppedFundDistribution.should.be.bignumber.eq(await this.crowdsale.airdroppedFundDistribution()); 
      advisorsFundDistribution.should.be.bignumber.eq(await this.crowdsale.advisorsFundDistribution()); 
      teamFundDistribution.should.be.bignumber.eq(await this.crowdsale.teamFundDistribution()); 
      bussinesFundDistribution.should.be.bignumber.eq(await this.crowdsale.bussinesFundDistribution()); 
      reserveFundDistribution.should.be.bignumber.eq(await this.crowdsale.reserveFundDistribution()); 
      privateFundDistribution.should.be.bignumber.eq(await this.crowdsale.privateFundDistribution()); 
      preFundDistribution.should.be.bignumber.eq(await this.crowdsale.preFundDistribution()); 
      publicFundDistribution.should.be.bignumber.eq(await this.crowdsale.publicFundDistribution());
    });
 
    it('is a valid percentage breakdown', async function () {
      const crowdsaleFundDistribution  = await this.crowdsale.crowdsaleFundDistribution();
      const airdroppedFundDistribution = await this.crowdsale.airdroppedFundDistribution();
      const advisorsFundDistribution   = await this.crowdsale.advisorsFundDistribution();
      const teamFundDistribution       = await this.crowdsale.teamFundDistribution();
      const bussinesFundDistribution   = await this.crowdsale.bussinesFundDistribution();
      const reserveFundDistribution    = await this.crowdsale.reserveFundDistribution();
      const total = crowdsaleFundDistribution.toNumber() + airdroppedFundDistribution.toNumber() + advisorsFundDistribution.toNumber()
      + teamFundDistribution.toNumber() + bussinesFundDistribution.toNumber() + reserveFundDistribution.toNumber();
      total.should.equal(100);
    });

    it('is a valid tokens breakdown', async function () {
      const privateFundDistribution    = await this.crowdsale.privateFundDistribution();
      const preFundDistribution        = await this.crowdsale.preFundDistribution();
      const publicFundDistribution     = await this.crowdsale.publicFundDistribution();
      const total = privateFundDistribution.toNumber() +  preFundDistribution.toNumber() + publicFundDistribution.toNumber();
      total.should.equal(35);
    });
  });

  describe('Behavior', async function () {
    it('handles goal reached', async function () {
      
    });
  });
});
 