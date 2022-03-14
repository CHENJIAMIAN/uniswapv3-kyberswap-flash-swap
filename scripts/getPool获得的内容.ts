import UniswapV3Factory from '@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Factory.sol/IUniswapV3Factory.json';
import UniswapV3Pool from '@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json';
import { BytesLike } from 'ethers';
import { ethers } from 'hardhat';

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
const pool_address = await uniswapV3Factory.getPool(DAI, UNI, 3000);
const poolContract = new ethers.Contract(
    pool_address,
    UniswapV3Pool.abi,
    wallet
);
const slot0 = await poolContract.slot0();
console.log('pool:', pool_address);
console.log('slot0:', slot0);
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
