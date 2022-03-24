import { useEffect } from 'react';
import { utils, providers, Wallet, Contract, BigNumber } from 'ethers';
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

const App = () => {
    //**** create provider for mumbai */
    const alchemyKey: string = process.env
        .REACT_APP_ALCHEMY_KEY!.toString()
        .trim();
    const provider = new providers.AlchemyProvider(
        80001,
        alchemyKey
    ) as providers.AlchemyProvider;
    const chainId = ChainId.MUMBAI as number;

    //**** transaction settings */
    const addrFactory: string = utils.getAddress(
        '0x7900309d0b1c8D3d665Ae40e712E8ba4FC4F5453'
    ); // dmm factory contract on mumbai
    const addrTokenA: string = utils.getAddress(
        '0x001b3b4d0f3714ca98ba10f6042daebf0b1b7b6f'
    ); // dai on mumbai
    const addrTokenB: string = utils.getAddress(
        '0x2058a9d7613eee744279e3856ef0eada5fcbaa7e'
    ); // usdc on mumbai

    //**** async function to swap */
    const getDatas = async () => {
        // define tokens for swap
        const tokenA: Token = await Fetcher.fetchTokenData(
            chainId,
            addrTokenA,
            provider,
            'DAI',
            'DAI stablecoin'
        ); // dai token object
        const tokenB: Token = await Fetcher.fetchTokenData(
            chainId,
            addrTokenB,
            provider,
            'USDC',
            'USDC stablecoin'
        ); // usdc token object
        // define Pair[] object [dai, usdc]
        const pair: Pair[] = await Fetcher.fetchPairData(
            tokenA,
            tokenB,
            addrFactory,
            provider
        );
        // define route object [dai, usdc]
        const route = new Route(pair, tokenA, tokenB) as Route;
        // define initial input amount in dai
        // const base: bigint = BigInt(Math.pow(10, route.path[0].decimals));
        // const amountInValue: BigNumber = BigNumber.from(100).mul(base); // 100 * 10^18 == 100 dai
        const amountInValue: BigNumber = utils.parseUnits(
            '100.0',
            route.path[0].decimals
        );
        const amountIn: TokenAmount = new TokenAmount(
            tokenA,
            amountInValue.toBigInt()
        );
        // define trade object
        const trade = new Trade(
            route,
            amountIn,
            TradeType.EXACT_INPUT
        ) as Trade;
        // define slippage settings = 0.5%
        const slippageTolerance: Percent = new Percent('50', '10000');
        // compute final minimum output amount
        const amountOutMin: JSBI =
            trade.minimumAmountOut(slippageTolerance).raw;
        // needs to be converted to e.g. hex
        const amountOutMinHex: string = BigNumber.from(
            amountOutMin.toString()
        ).toHexString();
        // get related pools adresses array for this pair of tokens
        const poolsPath: string[] = await Fetcher.fetchPairAddresses(
            tokenA,
            tokenB,
            addrFactory,
            provider
        );
        // define array of tokens adresses
        const path: string[] = [tokenA.address, tokenB.address];
        // define recipient address for swap
        const to: string = utils.getAddress('0x...');
        // define deadline for transaction < 15'
        const block = (await provider.getBlock('latest')) as providers.Block;
        const deadline: number = block.timestamp + 15;
        // compute input amount -> for exact input trades, this value should be passed as amountIn
        // (TokenAmount type) to router functions.
        const inputAmount: JSBI = trade.inputAmount.raw;
        console.log('trade.inputAmount.raw', inputAmount);
        // needs to be converted to e.g. hex
        const inputAmountHex: string = BigNumber.from(
            inputAmount.toString()
        ).toHexString();
        // define options for swap transaction
        interface IOptionsSwapTx {
            value: string;
            gasPrice: BigNumber;
            gasLimit: BigNumber;
        }
        const optionsSwapTx: IOptionsSwapTx = {
            value: inputAmountHex,
            gasPrice: utils.parseUnits('30.0', 'gwei'),
            gasLimit: utils.parseUnits('0.02', 'gwei'),
        };
        // define signer for swap transaction
        const signer = Wallet.fromMnemonic(
            process.env.REACT_APP_MNEMONIC!,
            process.env.REACT_APP_ACCOUNT_PATH!
        ) as Wallet;
        // define account
        const account = signer.connect(provider) as Wallet;
        // define dmm Router contract
        const DmmRouter: string[] = [
            'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata poolsPath, address[] calldata path, address to, uint deadline)',
        ];
        const DmmRouterInterface = new utils.Interface(
            DmmRouter
        ) as utils.Interface;
        const dmm = new Contract(
            utils.getAddress('0xD536e64EAe5FBc62E277167e758AfEA570279956'),
            DmmRouterInterface,
            account
        ) as Contract;
        // get the approve for dai token and
        const tokenAcontract = new Contract(
            tokenA.address,
            [
                'function approve(address spender, uint amount) public returns(bool)',
            ],
            account
        );
        const askApprove = await tokenAcontract.approve(
            dmm.address,
            amountInValue.toBigInt(),
            {
                gasPrice: optionsSwapTx.gasPrice,
                gasLimit: optionsSwapTx.gasLimit,
            }
        );
        const receiptApprove = await askApprove.wait();
        // swap execution
        const txSwap = await dmm.swapExactTokensForTokens(
            inputAmountHex,
            amountOutMinHex,
            poolsPath,
            path,
            to,
            deadline,
            optionsSwapTx
        );
        console.log(`Transaction hash: ${txSwap.hash}`);
        const receiptTxSwap = await txSwap.wait();
        console.log(
            `Transaction was mined in block ${receiptTxSwap.blockNumber}`
        );
    };

    useEffect(() => {
        getDatas();
    }, []);

    return <div className="App">test</div>;
};
