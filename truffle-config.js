"use strict";

require("dotenv").config();
const LoomTruffleProvider = require("loom-truffle-provider");

module.exports = {
  networks: {
    coverage: {
      host: "localhost",
      port: 8555,
      gas: 0xfffffffffff,
      gasPrice: 0x01,
      network_id: "*"
    },
    // development: {
    //   host: "127.0.0.1",
    //   port: 7545,
    //   gas: 6721975, // default gas limit
    //   gasPrice: 20000000000, // 20 gwei
    //   network_id: "*" // Match any network id
    // },
    development: {
      provider: () => {
        const provider = new LoomTruffleProvider(
          process.env.TEST_CHAIN_ID,
          process.env.TEST_WRITE_URL,
          process.env.TEST_READ_URL,
          process.env.TEST_PRIVATE_KEY
        );
        provider.createExtraAccountsFromMnemonic(
          "gravity top burden flip student usage spell purchase hundred improve check genre",
          10
        );
        const engine = provider.getProviderEngine();
        engine.addCustomMethod("web3_clientVersion", () => "");
        return provider;
      },
      network_id: "*"
    },
    deploy: {
      provider: () => {
        const provider = new LoomTruffleProvider(
          process.env.CHAIN_ID,
          process.env.WRITE_URL,
          process.env.READ_URL,
          process.env.ADMIN_PRIVATE_KEY
        );
        const engine = provider.getProviderEngine();
        engine.addCustomMethod("web3_clientVersion", () => "");
        return provider;
      },
      network_id: "*"
    },
    console: {
      provider: () => {
        const provider = new LoomTruffleProvider(
          process.env.CHAIN_ID,
          process.env.WRITE_URL,
          process.env.READ_URL,
          process.env.OWNER_PRIVATE_KEY
        );
        const engine = provider.getProviderEngine();
        engine.addCustomMethod("web3_clientVersion", () => "");
        return provider;
      },
      network_id: "*"
    }
  },
  mocha: {
    // reporter: 'eth-gas-reporter',
    // reporterOptions: {
    //   currency: 'USD',
    //   gasPrice: 21
    // },
    enableTimeouts: false
  },
  compilers: {
    solc: {
      version: "0.5.3",
      settings: {
        // See the solidity docs for advice about optimization and evmVersion
        optimizer: {
          enabled: true,
          runs: 200
        },
        evmVersion: "byzantium"
      }
    }
  }
};
