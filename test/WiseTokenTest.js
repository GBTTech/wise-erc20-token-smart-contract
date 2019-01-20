const WiseToken = artifacts.require('./WiseToken.sol');

contract('WiseToken', (accounts) => {
  const _name = 'JAMESJARA25';
  const _symbol = 'JJJ25';
  const _decimals = 18;

  beforeEach(async function () {
    this.token = await WiseToken.new();
  });

  describe('token attributes', function () {
    it('has the correct name', async function () {
      const name = await this.token.name();
      name.should.equal(_name);
    });

    it('has the correct symbol', async function () {
      const symbol = await this.token.symbol();
      symbol.should.equal(_symbol);
    });

    it('has the correct decimals', async function () {
      const decimals = await this.token.decimals();
      decimals.toString().should.be.equal(String(_decimals));
    });
  });
});
