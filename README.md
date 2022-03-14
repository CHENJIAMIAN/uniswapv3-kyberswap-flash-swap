# [教程](https://medium.com/coinmonks/tutorial-of-flash-swaps-of-uniswap-v3-73c0c846b822)

contract.initFlash -> pool.flash -> uniswapV3FlashCallback -> swapOnUniswap/swapOnKyber -> payback

# 闪存交换示例

闪存交换示例

## 安装和设置

### 1.如果您还没有安装[Node.js](https://nodejs.org/en/)和[yarn 。](https://classic.yarnpkg.com/en/docs/install/#windows-stable)

### 2. 克隆这个仓库

运行以下命令。

```
git 克隆 https://github.com/yuichiroaoki/flash-swap-example.git
```

## 快速开始

现在这个 repo 只适用于安全帽主网分叉。

### 1.设置环境变量

您需要一个 ALCHEMY_MAINNET_RPC_URL 环境变量。您可以从[Alchemy 网站](https://alchemy.com/?r=33851811-6ecf-40c3-a36d-d0452dda8634)免费获得一个。

然后，您可以使用以下内容创建一个 .env 文件。

```
ALCHEMY_MAINNET_RPC_URL='<your-own-alchemy-mainnet-rpc-url>'
```

### 2.安装依赖

运行以下命令。

```
yarn install纱线安装
```

### 3. 编译智能合约

运行以下命令。

```
yarn compile纱线编译
```

### 4. 执行闪存交换🔥

运行以下命令。

```
yarn flashswaps纱线闪换
```

预期产出

```
$ yarn flashswaps
yarn run v1.22.5
$ npx hardhat run scripts/flashswaps.ts
No need to generate any newer typings.
deployer's initial balance 0
deployer's ending balance 4.860772792026915
Congrats! You earned 4.860772792026915 DAI !!
Done in 40.72s.
```

## 参考

### 对闪

Uniswap 官方文档中的示例闪兑合约。

[文档](https://docs.uniswap.org/protocol/guides/flash-integrations/final-contract)/ [GitHub](https://github.com/Uniswap/uniswap-v3-periphery/blob/flash-pair-example/contracts/examples/PairFlash.sol) /[测](https://github.com/Uniswap/uniswap-v3-periphery/blob/flash-pair-example/test/PairFlash.spec.ts)

Example of Flash Swaps

## Installation and Setup

### 1. Install [Node.js](https://nodejs.org/en/) & [yarn](https://classic.yarnpkg.com/en/docs/install/#windows-stable), if you haven't already.

### 2. Clone This Repo

Run the following command.

```console
git clone https://github.com/yuichiroaoki/flash-swap-example.git
```

## Quickstart

Right now this repo only works with hardhat mainnet fork.

### 1. Setup Environment Variables

You'll need an ALCHEMY_MAINNET_RPC_URL environment variable. You can get one from [Alchemy website](https://alchemy.com/?r=33851811-6ecf-40c3-a36d-d0452dda8634) for free.

Then, you can create a .env file with the following.

```
ALCHEMY_MAINNET_RPC_URL='<your-own-alchemy-mainnet-rpc-url>'
```

### 2. Install Dependencies

Run the following command.

```console
yarn install
```

### 3. Compile Smart Contracts

Run the following command.

```console
yarn compile
```

### 4. Execute Flash Swaps 🔥

Run the following command.

```console
yarn flashswaps
```

Expected Outputs

```
$ yarn flashswaps
yarn run v1.22.5
$ npx hardhat run scripts/flashswaps.ts
No need to generate any newer typings.
deployer's initial balance 0
deployer's ending balance 4.860772792026915
Congrats! You earned 4.860772792026915 DAI !!
Done in 40.72s.
```

## References

### PairFlash

A sample flash swap contract from Uniswap official docs.

[Docs](https://docs.uniswap.org/protocol/guides/flash-integrations/final-contract) / [GitHub](https://github.com/Uniswap/uniswap-v3-periphery/blob/flash-pair-example/contracts/examples/PairFlash.sol) / [Test](https://github.com/Uniswap/uniswap-v3-periphery/blob/flash-pair-example/test/PairFlash.spec.ts)
