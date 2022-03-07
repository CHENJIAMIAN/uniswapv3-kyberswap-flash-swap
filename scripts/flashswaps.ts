require('dotenv').config();
import { ethers } from 'hardhat';
import * as IERC20 from '../artifacts/@openzeppelin/contracts/token/ERC20/IERC20.sol/IERC20.json';
import { getErc20Balance, showErc20Balance } from '../utils/token';
import {
    DAI,
    KYBER_ADDRESS,
    SWAP_ROUTER,
    UNI,
    uniswapv3factory,
    USDC,
    weth9,
} from './address';

// var factoryV3 = new web3.eth.Contract(V3_factory_ABI.factory, factoryV3_address);
// var pool_address = await factoryV3.methods.getPool(dai_address,WETH_address,3000).call();
// var pool_1 = new web3.eth.Contract(V3_pool_ABI, pool_address);
// var pool_balance = await pool_1.methods.slot0.call().call();
// varsqrtPriceX96 = pool_balance[0];

// var number_1 =JSBI.BigInt(sqrtPriceX96 *sqrtPriceX96* (1e(decimals_token_0))/(1e(decimals_token_1))/JSBI.BigInt(2) ** (JSBI.BigInt(192));

import UniswapV3Factory from '@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Factory.sol/IUniswapV3Factory.json';
import UniswapV3Pool from '@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json';
import { BytesLike } from 'ethers';

const privateKey = process.env.PRIVATE_KEY;
const provider = new ethers.providers.InfuraProvider(
    'mainnet',
    process.env.INFURA_KEY
);

const wallet = new ethers.Wallet(privateKey as BytesLike, provider);
const uniswapV3Factory = new ethers.Contract(
    uniswapv3factory,
    UniswapV3Factory.abi,
    wallet
);
/* 
pool: 0x7cf70eD6213F08b70316bD80F7c2ddDc94E41aC5
slot0: [
  BigNumber {
    _hex: '0x4a7b4212c824a10c0a7a34cc4c81',
    _isBigNumber: true
  },
  197124,
  984,
  1440,
  1440,
  0,
  true,
  sqrtPriceX96: BigNumber {
    _hex: '0x4a7b4212c824a10c0a7a34cc4c81',
    _isBigNumber: true
  },
  tick: 197124,
  observationIndex: 984,
  observationCardinality: 1440,
  observationCardinalityNext: 1440,
  feeProtocol: 0,
  unlocked: true
]
*/
/* 
pool: 0x7cf70eD6213F08b70316bD80F7c2ddDc94E41aC5
slot0: [
  BigNumber {
    _hex: '0x0311aa19b0dd4cf231bd9ef67d',
    _isBigNumber: true
  },
  22428,
  0,
  1,
  1,
  0,
  true,
  sqrtPriceX96: BigNumber {
    _hex: '0x0311aa19b0dd4cf231bd9ef67d',
    _isBigNumber: true
  },
  tick: 22428,
  observationIndex: 0,
  observationCardinality: 1,
  observationCardinalityNext: 1,
  feeProtocol: 0,
  unlocked: true
]
*/
async function main(
    borrowingTokenAddress: string,
    swapingPairTokenAddress: string,
    isUniKyb: Boolean,
    amount: number
) {
    const pool_address = await uniswapV3Factory.getPool(DAI, UNI, 3000);
	const poolContract = new ethers.Contract(
		pool_address,
		UniswapV3Pool.abi,
		wallet
	);
    const slot0 = await poolContract.slot0();
    console.log('pool:', pool_address);
    console.log('slot0:', slot0);
    return;
    // 首先部署FlashSwaps合约
    const Contract = await ethers.getContractFactory('FlashSwaps');
    const [deployer] = await ethers.getSigners();
    console.log('deployer:', deployer.address);
    const provider = ethers.provider;

    const contract = await Contract.deploy(
        SWAP_ROUTER,
        uniswapv3factory,
        ethers.utils.getAddress(weth9),
        KYBER_ADDRESS
    );

    const DECIMALS = 18;

    let swapingPairToken: any;
    let borrowingToken: any;
    swapingPairToken = new ethers.Contract(
        swapingPairTokenAddress,
        IERC20.abi,
        provider
    );
    borrowingToken = new ethers.Contract(
        borrowingTokenAddress,
        IERC20.abi,
        provider
    );

    const initialBalance = await getErc20Balance(
        borrowingToken,
        deployer.address,
        DECIMALS
    );
    console.log("deployer's initial balance", initialBalance);

    // borrow from token0, token1 fee1 pool
    // 然后调用initFlash 函数执行flash swaps,该函数启动 flash 交换过程
    // 它从token0 / token1池中借入数量为 amount0 的 token0 ，池费为fee1
    // 在这种情况下，它让你的合约以 0.05% 的费用从 DAI/USDC 池中借入 1,500 DAI 。
    const tx = await contract.initFlash({
        token0: ethers.utils.getAddress(borrowingTokenAddress), //DAI
        token1: ethers.utils.getAddress(USDC),
        token2: ethers.utils.getAddress(swapingPairTokenAddress), //UNI
        fee1: 500,
        amount0: ethers.utils.parseUnits(amount.toString(), DECIMALS),
        // 由于脚本将 0 作为amount1参数传递，因此合约不会借用任何 USDC
        amount1: 0,
        fee2: 500,
        unikyb: isUniKyb,
    });
    // 执行到了 FlashSwap.sol

    const endingBalance = await getErc20Balance(
        borrowingToken,
        deployer.address,
        DECIMALS
    );
    console.log("deployer's ending balance", endingBalance);

    const profit = endingBalance - initialBalance;

    if (profit > 0) {
        console.log(`Congrats! You earned ${profit} DAI !!`);
    }
}

main(DAI, UNI, false, 1500)
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
