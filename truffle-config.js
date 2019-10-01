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
    local: {
      host: "localhost",
      port: 8545,
      network_id: "*"
    },
    extdev: {
      provider: () => {
        const provider = new LoomTruffleProvider(
          "extdev-plasma-us1",
          "https://extdev-plasma-us1.dappchains.com/rpc",
          "https://extdev-plasma-us1.dappchains.com/query",
          process.env.ADMIN_PRIVATE_KEY
        );
        const engine = provider.getProviderEngine();
        engine.addCustomMethod("web3_clientVersion", () => "");
        return provider;
      },
      gasPrice: 0,
      network_id: "*"
    },
    plasma: {
      provider: () => {
        const provider = new LoomTruffleProvider(
          "default",
          "https://plasma.dappchains.com/rpc",
          "https://plasma.dappchains.com/query",
          process.env.ADMIN_PRIVATE_KEY
        );
        const engine = provider.getProviderEngine();
        engine.addCustomMethod("web3_clientVersion", () => "");
        return provider;
      },
      gasPrice: 0,
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
        evmVersion: "constantinople"
      }
    }
  }
};
