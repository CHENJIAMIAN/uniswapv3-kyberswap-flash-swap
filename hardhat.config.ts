import { config as dotEnvConfig } from "dotenv";
dotEnvConfig();
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-ethers";
import '@typechain/hardhat'
import "solidity-coverage"

import "./tasks/accounts";
import "./tasks/balance";
import "./tasks/block-number";


// 在部署方面，目前还没有官方插件可以为 Hardhat 实现部署系统,
// 可以将 Hardhat 与 Truffle 一起使用
module.exports = {
  solidity: "0.7.6",
  networks: {
    hardhat: {
      // 这将向安全帽网络公开一个 JSON-RPC 接口。要使用它，请将您的钱包或应用程序连接到.http://localhost:8545
      forking: {
        url: process.env.ALCHEMY_MAINNET_RPC_URL,
        blockNumber: 12975788
        // Hardhat Network 将默认从最新的主网块分叉。虽然根据上下文这可能是可行的，但要设置依赖于分叉的测试套件，我们建议从特定的块号分叉。
      }
    }
  },
  mocha: {
    timeout: 200000
  }
};