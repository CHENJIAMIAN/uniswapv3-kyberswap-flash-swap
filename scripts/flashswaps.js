require('dotenv').config();

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

const Web3 = require('web3');
const { ethers } = require('hardhat');
const moment = require('moment-timezone');

const kyberNetProxyABI = require('./KyberNetworkProxy-v2.0.0-ABI.json');
const ERC20 = require('@openzeppelin/contracts/build/contracts/ERC20.json');
const FlashSwaps = require('../artifacts/contracts/FlashSwaps.sol/FlashSwaps.json');
const IQuoter = require('@uniswap/v3-periphery/artifacts/contracts/interfaces/IQuoter.sol/IQuoter.json');
const { getErc20Balance, showErc20Balance } = require('../utils/token');

(async function () {
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

    /* hardhat测试 */
    // const provider = ethers.provider;
    // const privateKey =
    //     'ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
    // const wallet = new ethers.Wallet(privateKey, provider);
    // // const [deployer] = await ethers.getSigners();
    // // console.log({ deployer });

    // const Contract = await ethers.getContractFactory('FlashSwaps');
    // const contract = await Contract.deploy(
    //     SWAP_ROUTER,
    //     uniswapv3factory,
    //     ethers.utils.getAddress(weth9),
    //     KYBER_ADDRESS
    // );

    var uniswapQuoter = new ethers.Contract(
        '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6',
        IQuoter.abi,
        wallet
    );
    const kyberNetProxyContract = new ethers.Contract(
        '0x9AAb3f75489902f3a48495025729a0AF77d4b11e',
        kyberNetProxyABI,
        wallet
    );

    // WEB3 CONFIG
    var web3 = new Web3(
        new Web3.providers.WebsocketProvider(
            'wss://mainnet.infura.io/ws/v3/1b118c1ba6424b8f9e52031c6f967a1d'
        )
    );
    var uniswapRouter = new web3.eth.Contract(
        IQuoter.abi,
        '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6'
    );

    // this checks and prints the exchange rates between 2 DEXES for any 2 tokens
    async function checkPairProfitable(args) {
        const {
            inputTokenSymbol,
            inputTokenAddress,
            outputTokenSymbol,
            outputTokenAddress,
            inputAmountWei,
        } = args;

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
        let uniswapResult = await uniswapRouter.methods
            .quoteExactInputSingle(
                inputTokenAddress,
                outputTokenAddress,
                3000, //表示0.3%,添加流动性时，手续费可以有 3个级别供选择：0.05%, 0.3% 和 1%，未来可以通过治理加入更多可选的手续费率
                // 一个代币对 v3 版本会有多个不同的流动池。例如 ETH/DAI 代币对，会分成三个池，分别对应 0.05%, 0.30%, 1.00% 的手续费
                ethers.utils.formatUnits(inputAmountWei, 0),
                0
            )
            .call();
        // 需要gasFee,返回的是tx, 不是结果, 为什么?
        // let uniswapResult = await uniswapQuoter.quoteExactInputSingle(
        //     inputTokenAddress,
        //     outputTokenAddress,
        //     3000, //表示0.3%,添加流动性时，手续费可以有 3个级别供选择：0.05%, 0.3% 和 1%，未来可以通过治理加入更多可选的手续费率
        //     // 一个代币对 v3 版本会有多个不同的流动池。例如 ETH/DAI 代币对，会分成三个池，分别对应 0.05%, 0.30%, 1.00% 的手续费
        //     ethers.utils.formatUnits(inputAmountWei, 0),
        //     0
        // );
        // 不需要gasFee
        let kyberResult = await kyberNetProxyContract.getExpectedRate(
            inputTokenAddress,
            outputTokenAddress,
            ethers.utils.formatUnits(inputAmountWei, 0)
        );
        console.log({ uniswapResult, kyberResult: kyberResult.worstRate });

        const uniResultEther = uniswapResult / 10 ** outputTokenDecimal;
        const inputAmountEther = ethers.utils.formatEther(inputAmountWei);
        // const intKyberExpectedRate =
        //     Number(ethers.utils.formatEther(kyberResult.expectedRate)) *
        //     Number(inputAmountEther);
        const kyberWorstResultEther =
            Number(ethers.utils.formatEther(kyberResult.worstRate)) *
            Number(inputAmountEther);

        const rate =
            (kyberWorstResultEther - uniResultEther) /
            (kyberWorstResultEther + uniResultEther);
        // print in form of table
        console.table([
            {
                'Input Token': inputTokenSymbol,
                'Output Token': outputTokenSymbol,
                'Input Amount': inputAmountEther,
                'Uniswap Return': uniResultEther,
                // 'Kyber Expected Rate': intKyberExpectedRate,
                'Kyber Min Return': kyberWorstResultEther,
                rate,
                'rate > 3%': rate > 0.03,
                Timestamp: moment().tz('Asia/Shanghai').format(),
            },
        ]);
        if (rate > 0.03)
            await callFlashContract(
                inputTokenAddress,
                outputTokenAddress,
                false,
                inputAmountEther
            );
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

    // Check markets every n seconds
    const POLLING_INTERVAL = Number(process.env.POLLING_INTERVAL) || 1000; // 1 Second
    priceMonitorInterval = setInterval(async () => {
        await monitorPrice();
    }, POLLING_INTERVAL);

    // 测试callFlashContract
    // (async () => {
    //     await callFlashContract(DAI, UNI, false, 1500);
    // })();

    // monitorPrice -> checkPairProfitable -> callFlashContract
})();
