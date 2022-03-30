<script>

const DAI = '0x6B175474E89094C44Da98b954EedeAC495271d0F';
const UNI = '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984';
const DAI_WHALE = '0xA929022c9107643515F5c777cE9a910F0D1e490C';
const WETH_WHALE = '0x0F4ee9631f4be0a63756515141281A3E2B293Bbe';
const WBTC = '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599';
const USDC = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const USDT = '0xdac17f958d2ee523a2206206994597c13d831ec7';
const SNX = '0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F';
const COMP = '0xc00e94cb662c3520282e6f5717214004a7f26888';
const SWAP_ROUTER = '0xE592427A0AEce92De3Edee1F18E0157C05861564';
const uniswapv3factory = '0x1F98431c8aD98523631AE4a59f267346ea31F984';
const KYBER_ADDRESS = '0x818E6FECD516Ecc3849DAf6845e3EC868087B755';
const weth9 = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
const DMMRouter02_ADDRESS = '0x1c87257f5e8609940bc751a07bb085bb7f8cdbe6';//ROUTER_ADDRESSES_V2官网用的是v2版本的swap方法
const DMMFactory_Address = '0x833e4083B7ae46CeA85695c4f7ed25CDAd8886dE';
const ALCHEMY_MAINNET_RPC_URL =
    'https://eth-mainnet.alchemyapi.io/v2/VtVZNO2vb5Q9ErUUDQeMTNWpkvPgA2Dp';
const PRIVATE_KEY =
    'ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const INFURA_KEY = '1b118c1ba6424b8f9e52031c6f967a1d';
const WalletAddress = '0xF4781316cF04Df5126f7ea4e3fE1448198485b4b';

import { ethers, utils, providers, Wallet, Contract, BigNumber } from 'ethers';
import {
    ChainId,
    Fetcher,
    Route,
    Trade,
    TokenAmount,
    TradeType,
    Percent,
    JSBI,
    Token,
    Pair,
} from '@dynamic-amm/sdk';

const moment = require('moment-timezone');
const FlashSwaps = require('./artifacts/contracts/FlashSwaps.sol/FlashSwaps.json');
const ERC20 = require('@openzeppelin/contracts/build/contracts/ERC20.json');
const IQuoter = require('@uniswap/v3-periphery/artifacts/contracts/interfaces/IQuoter.sol/IQuoter.json');

// 主网测试
const provider = new ethers.providers.InfuraProvider(
    'mainnet',
    // 'ropsten',
    INFURA_KEY
);
const privateKey = PRIVATE_KEY;
const wallet = new ethers.Wallet(privateKey, provider);
const contract = new ethers.Contract(
    // 部署地址
    '0x396c5d786ADB2eb78C0dfa7BC2219dA0aF3E851F', //ropsten
    FlashSwaps.abi,
    wallet
);
var uniswapQuoter = new ethers.Contract(
    '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6',
    IQuoter.abi,
    wallet
);


</script>
<script setup>
import { defineComponent, createApp, reactive, onMounted, onUnmounted, toRefs, ref } from 'vue'

let state = ref({
    uniswapResultWei: '',
    进来的代币: '',
    从uniswap换得: '',
    kyber换回: '',
    rate: '',
    Timestamp: '',
})

let kyber_res_json;
async function checkPairProfitable(args) {
    const { inputTokenAddress, outputTokenAddress, inputAmountWei } = args;

    // fetch decimal of token to get precise outputs
    let outputTokenContract = new ethers.Contract(
        outputTokenAddress,
        ERC20.abi,
        wallet
    );
    let outputTokenDecimal = await outputTokenContract.decimals.call();

    /* 
    tokenIn	地址	被换入的代币
    tokenOut	地址	被换出的代币
    fee	uint24	为该货币对考虑的代币池费用, 池中每次交换收取的费用，以百分之一比普计价
    amountIn	uint256	所需输入量
    sqrtPriceLimitX96	uint160	交易所不能超过的矿池价格限制
    */
    //    与uni界面中不考虑滑点和gas费一致
    let uniswapResultWei =
        await uniswapQuoter.callStatic.quoteExactInputSingle(
            inputTokenAddress,
            outputTokenAddress,
            3000, //表示0.3%,添加流动性时，手续费可以有 3个级别供选择：0.05%, 0.3% 和 1%，未来可以通过治理加入更多可选的手续费率
            // 一个代币对 v3 版本会有多个不同的流动池。例如 ETH/DAI 代币对，会分成三个池，分别对应 0.05%, 0.30%, 1.00% 的手续费
            ethers.utils.formatUnits(inputAmountWei, 0),
            0
        );
    // 不需要gasFee
    const gas_res = await fetch(
        'https://api.krystal.app/ethereum/v2/swap/gasPrice'
    );
    const gas_res_json = await gas_res.json();
    //    与kyber界面中不考虑滑点和gas费一致
    const kyber_res = await fetch(
        `https://aggregator-api.kyberswap.com/ethereum/route?tokenIn=${outputTokenAddress}&tokenOut=${inputTokenAddress}&amountIn=${ethers.utils.formatUnits(
            uniswapResultWei,
            0
        )}&saveGas=0&gasInclude=0&gasPrice=${gas_res_json.gasPrice.default
        }000000000`
    );
    kyber_res_json = await kyber_res.json();
    const kyberOutputAmountEther = ethers.utils.formatEther(
        kyber_res_json.outputAmount
    );

    console.log(kyber_res_json);

    const inputAmountEther = ethers.utils.formatEther(inputAmountWei);
    const uniResultEther = uniswapResultWei / 10 ** outputTokenDecimal;
    const rate =
        ((Number(kyberOutputAmountEther) - Number(inputAmountEther)) /
            (Number(kyberOutputAmountEther) + Number(inputAmountEther))) *
        100;

    state.value = {
        uniswapResultWei,
        进来的代币: inputAmountEther,
        从uniswap换得: uniResultEther + '个中介币',
        kyber换回: kyberOutputAmountEther + '个原始币',
        rate: rate + '%',
        Timestamp: moment().tz('Asia/Shanghai').format(),
    }
    console.table([
        state.value
    ]);
    // if (rate > 3)
    await callFlashContract(
        inputTokenAddress,
        outputTokenAddress,
        false,
        inputAmountEther
    );
}

async function callFlashContract(
    borrowingTokenAddress,
    swapingPairTokenAddress,
    isUniKyb,
    amount
) {
    // 首先部署FlashSwaps合约
    // const Contract = await ethers.getContractFactory('FlashSwaps');
    // const signers = await ethers.getSigners();
    // const [deployer] = await ethers.getSigners();
    // console.log('deployer:', deployer.address);
    // const provider = ethers.provider;
    // use your own Infura node in production

    // const contract = await Contract.deploy(
    //     SWAP_ROUTER,
    //     uniswapv3factory,
    //     ethers.utils.getAddress(weth9),
    //     KYBER_ADDRESS
    // );
    const DECIMALS = 18;

    let swapingPairToken;
    let borrowingToken;
    swapingPairToken = new ethers.Contract(
        swapingPairTokenAddress,
        ERC20.abi,
        wallet
    );
    borrowingToken = new ethers.Contract(
        borrowingTokenAddress,
        ERC20.abi,
        wallet
    );

    // 然后调用initFlash 函数执行flash swaps,该函数启动 flash 交换过程
    // 它从uninswap的 token0/token1 池中借入数量为 amount0 的 token0 ，池费为 fee1
    // 在这种情况下，它让你的合约以 0.05% 的费用从 DAI/USDC 池中借入 1,500 DAI 。
    console.log('contract.initFlash');
    // const Contract = await ethers.getContractFactory('FlashSwaps');
    // const contract = await Contract.deploy(
    //     SWAP_ROUTER,
    //     uniswapv3factory,
    //     ethers.utils.getAddress(weth9),
    //     DMMRouter02_ADDRESS,
    //     DMMFactory_Address,
    //     kyber_res_json.outputAmount   // amountOutMinHex 
    // );
  

    const tx = await contract.initFlash(
        {
            token0: ethers.utils.getAddress(borrowingTokenAddress), //DAI
            token1: ethers.utils.getAddress(USDC),
            token2: ethers.utils.getAddress(swapingPairTokenAddress), //UNI 中介币
            fee1: 500,
            amount0: ethers.utils.parseUnits(amount.toString(), DECIMALS), //1500
            amount1: 0, // 由于脚本将 0 作为amount1参数传递，因此合约不会借用任何 USDC
            fee2: 500,
            unikyb: isUniKyb,
        },
        {
            // The maximum units of gas for the transaction to use
            gasLimit: 100_0000,

            // The price (in wei) per unit of gas
            gasPrice: ethers.utils.parseUnits('100', 'gwei'),
        }
    );
    console.log({ tx });
    // 执行到了 FlashSwap.sol

    // const profit = endingBalance - initialBalance;

    // if (profit > 0) {
    //     console.log(`Congrats! You earned ${profit} DAI !!`);
    // }
}

let priceMonitorInterval;
let monitoringPrice = false;
const addresses = {
    WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    MKR: '0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2',
    WBTC: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
    COMP: '0xc00e94cb662c3520282e6f5717214004a7f26888',
    UNI: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
    AAVE: '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9',
    AMP: '0xff20817765cb7f73d4bde2e66e067e58d11095c2',
};
async function monitorPrice() {
    const inputAmount = '100'; //要交换的数量 100个Ether, 此处1Ether表示一个单位, 不是表示一个ETH
    const inputAmountWei = ethers.utils.parseEther(inputAmount);

    if (monitoringPrice) {
        return;
    }

    monitoringPrice = true;

    try {
        [
            {
                inputTokenSymbol: 'DAI',
                inputTokenAddress: addresses['DAI'],
                outputTokenSymbol: 'UNI',
                outputTokenAddress: addresses['UNI'],
                inputAmountWei,
            },
        ].forEach(async (i) => {
            // ADD YOUR CUSTOM TOKEN PAIRS HERE!!!
            await checkPairProfitable(i);
        });
    } catch (error) {
        console.error(error);
        monitoringPrice = false;
        clearInterval(priceMonitorInterval);
        return;
    }

    monitoringPrice = false;
}

monitorPrice();

// const POLLING_INTERVAL = 1000 * 10;
// priceMonitorInterval = setInterval(async () => {
//     await monitorPrice();
// }, POLLING_INTERVAL);
</script>

<template>
    <pre>
        uniswapResultWei：{{ state.uniswapResultWei }}
        进来的代币：{{ state.进来的代币 }}
        从uniswap换得：{{ state.从uniswap换得 }}
        kyber换回：{{ state.kyber换回 }}
        rate：{{ state.rate }}
        Timestamp：{{ state.Timestamp }}
    </pre>
</template>