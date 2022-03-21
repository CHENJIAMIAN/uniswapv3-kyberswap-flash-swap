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

import { ethers } from 'ethers';

const ERC20 = require('@openzeppelin/contracts/build/contracts/ERC20.json');
const IQuoter = require('@uniswap/v3-periphery/artifacts/contracts/interfaces/IQuoter.sol/IQuoter.json');

(async () => {
    // 主网测试
    const provider = new ethers.providers.InfuraProvider(
        'mainnet',
        // 'ropsten',
        process.env.INFURA_KEY
    );
    const privateKey = process.env.PRIVATE_KEY;
    const wallet = new ethers.Wallet(privateKey, provider);
    const contract = new ethers.Contract(
        // 部署地址
        '0x396c5d786ADB2eb78C0dfa7BC2219dA0aF3E851F', //ropsten
        FlashSwaps.abi,
        wallet
    );
    const gas_res = await fetch(
        'https://api.krystal.app/ethereum/v2/swap/gasPrice'
    );
    const gas_res_json = await gas_res.json();
    console.log(gas_res_json);

    const kyber_res = await fetch(
        `https://aggregator-api.kyberswap.com/ethereum/route?tokenIn=${outputTokenAddress}&tokenOut=${inputTokenAddress}&amountIn=${ethers.utils.formatUnits(
            inputAmountWei,
            0
        )}&saveGas=0&gasInclude=0&gasPrice=${
            gas_res_json.gasPrice.default
        }000000000`
    );

    // const kyber_res = await fetch(`https://aggregator-api.kyberswap.com/ethereum/route?tokenIn=0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2&tokenOut=0x6b175474e89094c44da98b954eedeac495271d0f&amountIn=1000000000000000000&saveGas=0&gasInclude=0`);
    const kyber_res_json = await kyber_res.json();
    console.log(kyber_res_json.outputAmount);
})();
