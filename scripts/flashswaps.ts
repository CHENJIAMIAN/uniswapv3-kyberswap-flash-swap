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
const DMMRouter02_ADDRESS = '0x1c87257f5e8609940bc751a07bb085bb7f8cdbe6';
const DMMFactory_Address = '0x833e4083B7ae46CeA85695c4f7ed25CDAd8886dE';

const { ethers } = require('hardhat');
const moment = require('moment-timezone');

const ERC20 = require('@openzeppelin/contracts/build/contracts/ERC20.json');
const FlashSwaps = require('../artifacts/contracts/FlashSwaps.sol/FlashSwaps.json');
const IQuoter = require('@uniswap/v3-periphery/artifacts/contracts/interfaces/IQuoter.sol/IQuoter.json');
const { getErc20Balance, showErc20Balance } = require('../utils/token');

(async function () {
    // 主网测试
    // const provider = new ethers.providers.InfuraProvider(
    //     'mainnet',
    //     // 'ropsten',
    //     process.env.INFURA_KEY
    // );
    // const privateKey = process.env.PRIVATE_KEY;
    // const wallet = new ethers.Wallet(privateKey, provider);
    // const contract = new ethers.Contract(
    //     // 部署地址
    //     '0x396c5d786ADB2eb78C0dfa7BC2219dA0aF3E851F', //ropsten
    //     FlashSwaps.abi,
    //     wallet
    // );

    /* hardhat测试 */
    const provider = ethers.provider;
    const privateKey =
        'ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
    const wallet = new ethers.Wallet(privateKey, provider);
    const [deployer] = await ethers.getSigners();
    console.log({ deployer });

    const Contract = await ethers.getContractFactory('FlashSwaps');
    const contract = await Contract.deploy(
        SWAP_ROUTER,
        uniswapv3factory,
        ethers.utils.getAddress(weth9),
        DMMRouter02_ADDRESS,
        DMMFactory_Address,
        1 // amountOutMinHex
    );

    async function callFlashContract(
        borrowingTokenAddress: string,
        swapingPairTokenAddress: string,
        isUniKyb: boolean,
        amount: number
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
        const WalletAddress = process.env.WalletAddress;

        const initialBalance = await getErc20Balance(
            borrowingToken,
            WalletAddress,
            DECIMALS
        );
        console.log("deployer's initial balance", initialBalance);

        // 然后调用initFlash 函数执行flash swaps,该函数启动 flash 交换过程
        // 它从uninswap的 token0/token1 池中借入数量为 amount0 的 token0 ，池费为 fee1
        // 在这种情况下，它让你的合约以 0.05% 的费用从 DAI/USDC 池中借入 1,500 DAI 。
        console.log('contract.initFlash');
        // const Contract = await ethers.getContractFactory('FlashSwaps');
        // const contract = await Contract.deploy(
        //     SWAP_ROUTER,
        //     uniswapv3factory,
        //     ethers.utils.getAddress(weth9),
        //     KYBER_ADDRESS
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

        // const endingBalance = await getErc20Balance(
        //     borrowingToken,
        //     WalletAddress,
        //     DECIMALS
        // );
        // console.log("deployer's ending balance", endingBalance);

        // const profit = endingBalance - initialBalance;

        // if (profit > 0) {
        //     console.log(`Congrats! You earned ${profit} DAI !!`);
        // }
    }

    // 测试callFlashContract
    await callFlashContract(DAI, UNI, false, 1500);
})();
