import UniswapV3Factory from '@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Factory.sol/IUniswapV3Factory.json';
import { ethers } from 'hardhat';
import { abi as QuoterABI } from '@uniswap/v3-periphery/artifacts/contracts/lens/Quoter.sol/Quoter.json'


// useBestV3TradeExactIn  
//     const quotesResults = useSingleContractMultipleData(quoter, 'quoteExactInput', quoteExactInInputs)
//         useCallsData
//             useActiveWeb3React
//     const { bestRoute, amountOut } = quotesResults.reduce



    const privateKey = process.env.PRIVATE_KEY;
    const provider = new ethers.providers.InfuraProvider(
        'mainnet',
        process.env.INFURA_KEY
    );
    const wallet = new ethers.Wallet(privateKey as BytesLike, provider);
    const quoter = new ethers.Contract(
      "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6",
      QuoterABI,
      wallet
    );
    quoter.quoteExactInput()
