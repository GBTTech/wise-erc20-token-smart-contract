require('babel-register');
require('babel-polyfill');
require('dotenv').config();
const HDWalletProvider = require('truffle-hdwallet-provider');

module.exports = {
  networks: {
    development: {
      gasPrice: 2000000000,
      gas: 6721975,
      host: "localhost",
      port: 7545,
      network_id: "5777"
    },
    ganache: {
      gas: 2000000,
      gasPrice: 0,
      host: "localhost",
      port: 8545,  
      network_id: "*"
    }, 
    ropsten:  {
      provider: function() {
        return new HDWalletProvider(
          process.env.MNEMONIC,
          `https://ropsten.infura.io/${process.env.INFURA_API_KEY}`
        )
      },  
      gas: 5000000,
      gasPrice: 25000000000, 
      network_id: 3,
      //from: "0x46A9F5F1cA37958845c12F19ba61C93DEBB6eD30"
      //gasPrice: 10000000000
    }
  },
  solc: {
    optimizer: {
      enabled: true,
      runs: 200
    }
  },
  compilers: {
    solc: {
      version: "^0.4.22"
    }
  }
};
