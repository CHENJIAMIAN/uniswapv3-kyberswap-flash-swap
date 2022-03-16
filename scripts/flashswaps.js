require('dotenv').config();
const { ethers } = require('hardhat');
const IERC20 = require('../artifacts/@openzeppelin/contracts/token/ERC20/IERC20.sol/IERC20.json');
const FlashSwaps = require('../artifacts/contracts/FlashSwaps.sol/FlashSwaps.json');
const { getErc20Balance, showErc20Balance } = require('../utils/token');
const {
    DAI,
    KYBER_ADDRESS,
    SWAP_ROUTER,
    UNI,
    uniswapv3factory,
    USDC,
    weth9,
} = require('./address');
const express = require('express');
const http = require('http');
const Web3 = require('web3');
const moment = require('moment-timezone');

// SERVER CONFIG
const PORT = process.env.PORT || 5000;
const WalletAddress = process.env.WalletAddress;

const app = express();
const server = http
    .createServer(app)
    .listen(PORT, () => console.log(`Listening on ${PORT}`));

// WEB3 CONFIG
var web3 = new Web3(
    new Web3.providers.WebsocketProvider(
        process.env.RPC_URL_WS ||
            // `wss://mainnet.infura.io/ws/v3/1b118c1ba6424b8f9e52031c6f967a1d`
            `wss://ropsten.infura.io/ws/v3/1b118c1ba6424b8f9e52031c6f967a1d`
    )
);

// Uniswap V3 Router Contract: https://etherscan.io/address/0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6#code
const UNISWAP_QUOTER_ABI = [
    {
        inputs: [
            { internalType: 'address', name: '_factory', type: 'address' },
            { internalType: 'address', name: '_WETH9', type: 'address' },
        ],
        stateMutability: 'nonpayable',
        type: 'constructor',
    },
    {
        inputs: [],
        name: 'WETH9',
        outputs: [{ internalType: 'address', name: '', type: 'address' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'factory',
        outputs: [{ internalType: 'address', name: '', type: 'address' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            { internalType: 'bytes', name: 'path', type: 'bytes' },
            { internalType: 'uint256', name: 'amountIn', type: 'uint256' },
        ],
        name: 'quoteExactInput',
        outputs: [
            { internalType: 'uint256', name: 'amountOut', type: 'uint256' },
        ],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            { internalType: 'address', name: 'tokenIn', type: 'address' },
            { internalType: 'address', name: 'tokenOut', type: 'address' },
            { internalType: 'uint24', name: 'fee', type: 'uint24' },
            { internalType: 'uint256', name: 'amountIn', type: 'uint256' },
            {
                internalType: 'uint160',
                name: 'sqrtPriceLimitX96',
                type: 'uint160',
            },
        ],
        name: 'quoteExactInputSingle',
        outputs: [
            { internalType: 'uint256', name: 'amountOut', type: 'uint256' },
        ],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            { internalType: 'bytes', name: 'path', type: 'bytes' },
            { internalType: 'uint256', name: 'amountOut', type: 'uint256' },
        ],
        name: 'quoteExactOutput',
        outputs: [
            { internalType: 'uint256', name: 'amountIn', type: 'uint256' },
        ],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            { internalType: 'address', name: 'tokenIn', type: 'address' },
            { internalType: 'address', name: 'tokenOut', type: 'address' },
            { internalType: 'uint24', name: 'fee', type: 'uint24' },
            { internalType: 'uint256', name: 'amountOut', type: 'uint256' },
            {
                internalType: 'uint160',
                name: 'sqrtPriceLimitX96',
                type: 'uint160',
            },
        ],
        name: 'quoteExactOutputSingle',
        outputs: [
            { internalType: 'uint256', name: 'amountIn', type: 'uint256' },
        ],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            { internalType: 'int256', name: 'amount0Delta', type: 'int256' },
            { internalType: 'int256', name: 'amount1Delta', type: 'int256' },
            { internalType: 'bytes', name: 'path', type: 'bytes' },
        ],
        name: 'uniswapV3SwapCallback',
        outputs: [],
        stateMutability: 'view',
        type: 'function',
    },
];
const UNISWAP_QUOTER_ADDRESS = '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6';
var uniswapRouter = new web3.eth.Contract(
    UNISWAP_QUOTER_ABI,
    UNISWAP_QUOTER_ADDRESS
);

// Kyber mainnet proxy: https://etherscan.io/address/0x9AAb3f75489902f3a48495025729a0AF77d4b11e#readContract
const kyberNetProxyAddress = '0x9AAb3f75489902f3a48495025729a0AF77d4b11e';
const kyberNetProxyABI = [
    {
        inputs: [{ internalType: 'address', name: '_admin', type: 'address' }],
        stateMutability: 'nonpayable',
        type: 'constructor',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: false,
                internalType: 'address',
                name: 'newAdmin',
                type: 'address',
            },
            {
                indexed: false,
                internalType: 'address',
                name: 'previousAdmin',
                type: 'address',
            },
        ],
        name: 'AdminClaimed',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: false,
                internalType: 'address',
                name: 'newAlerter',
                type: 'address',
            },
            {
                indexed: false,
                internalType: 'bool',
                name: 'isAdd',
                type: 'bool',
            },
        ],
        name: 'AlerterAdded',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: false,
                internalType: 'uint256',
                name: 'amount',
                type: 'uint256',
            },
            {
                indexed: false,
                internalType: 'address',
                name: 'sendTo',
                type: 'address',
            },
        ],
        name: 'EtherWithdraw',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: 'address',
                name: 'trader',
                type: 'address',
            },
            {
                indexed: false,
                internalType: 'contract IERC20',
                name: 'src',
                type: 'address',
            },
            {
                indexed: false,
                internalType: 'contract IERC20',
                name: 'dest',
                type: 'address',
            },
            {
                indexed: false,
                internalType: 'address',
                name: 'destAddress',
                type: 'address',
            },
            {
                indexed: false,
                internalType: 'uint256',
                name: 'actualSrcAmount',
                type: 'uint256',
            },
            {
                indexed: false,
                internalType: 'uint256',
                name: 'actualDestAmount',
                type: 'uint256',
            },
            {
                indexed: false,
                internalType: 'address',
                name: 'platformWallet',
                type: 'address',
            },
            {
                indexed: false,
                internalType: 'uint256',
                name: 'platformFeeBps',
                type: 'uint256',
            },
        ],
        name: 'ExecuteTrade',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: false,
                internalType: 'contract IKyberHint',
                name: 'kyberHintHandler',
                type: 'address',
            },
        ],
        name: 'KyberHintHandlerSet',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: false,
                internalType: 'contract IKyberNetwork',
                name: 'newKyberNetwork',
                type: 'address',
            },
            {
                indexed: false,
                internalType: 'contract IKyberNetwork',
                name: 'previousKyberNetwork',
                type: 'address',
            },
        ],
        name: 'KyberNetworkSet',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: false,
                internalType: 'address',
                name: 'newOperator',
                type: 'address',
            },
            {
                indexed: false,
                internalType: 'bool',
                name: 'isAdd',
                type: 'bool',
            },
        ],
        name: 'OperatorAdded',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: false,
                internalType: 'contract IERC20',
                name: 'token',
                type: 'address',
            },
            {
                indexed: false,
                internalType: 'uint256',
                name: 'amount',
                type: 'uint256',
            },
            {
                indexed: false,
                internalType: 'address',
                name: 'sendTo',
                type: 'address',
            },
        ],
        name: 'TokenWithdraw',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: false,
                internalType: 'address',
                name: 'pendingAdmin',
                type: 'address',
            },
        ],
        name: 'TransferAdminPending',
        type: 'event',
    },
    {
        inputs: [
            { internalType: 'address', name: 'newAlerter', type: 'address' },
        ],
        name: 'addAlerter',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            { internalType: 'address', name: 'newOperator', type: 'address' },
        ],
        name: 'addOperator',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [],
        name: 'admin',
        outputs: [{ internalType: 'address', name: '', type: 'address' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'claimAdmin',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [],
        name: 'enabled',
        outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'getAlerters',
        outputs: [{ internalType: 'address[]', name: '', type: 'address[]' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            { internalType: 'contract ERC20', name: 'src', type: 'address' },
            { internalType: 'contract ERC20', name: 'dest', type: 'address' },
            { internalType: 'uint256', name: 'srcQty', type: 'uint256' },
        ],
        name: 'getExpectedRate',
        outputs: [
            { internalType: 'uint256', name: 'expectedRate', type: 'uint256' },
            { internalType: 'uint256', name: 'worstRate', type: 'uint256' },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            { internalType: 'contract IERC20', name: 'src', type: 'address' },
            { internalType: 'contract IERC20', name: 'dest', type: 'address' },
            { internalType: 'uint256', name: 'srcQty', type: 'uint256' },
            {
                internalType: 'uint256',
                name: 'platformFeeBps',
                type: 'uint256',
            },
            { internalType: 'bytes', name: 'hint', type: 'bytes' },
        ],
        name: 'getExpectedRateAfterFee',
        outputs: [
            { internalType: 'uint256', name: 'expectedRate', type: 'uint256' },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'getOperators',
        outputs: [{ internalType: 'address[]', name: '', type: 'address[]' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'kyberHintHandler',
        outputs: [
            { internalType: 'contract IKyberHint', name: '', type: 'address' },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'kyberNetwork',
        outputs: [
            {
                internalType: 'contract IKyberNetwork',
                name: '',
                type: 'address',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'maxGasPrice',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'pendingAdmin',
        outputs: [{ internalType: 'address', name: '', type: 'address' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [{ internalType: 'address', name: 'alerter', type: 'address' }],
        name: 'removeAlerter',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            { internalType: 'address', name: 'operator', type: 'address' },
        ],
        name: 'removeOperator',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'contract IKyberHint',
                name: '_kyberHintHandler',
                type: 'address',
            },
        ],
        name: 'setHintHandler',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'contract IKyberNetwork',
                name: '_kyberNetwork',
                type: 'address',
            },
        ],
        name: 'setKyberNetwork',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            { internalType: 'contract IERC20', name: 'token', type: 'address' },
            {
                internalType: 'uint256',
                name: 'minConversionRate',
                type: 'uint256',
            },
        ],
        name: 'swapEtherToToken',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'payable',
        type: 'function',
    },
    {
        inputs: [
            { internalType: 'contract IERC20', name: 'token', type: 'address' },
            { internalType: 'uint256', name: 'srcAmount', type: 'uint256' },
            {
                internalType: 'uint256',
                name: 'minConversionRate',
                type: 'uint256',
            },
        ],
        name: 'swapTokenToEther',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            { internalType: 'contract IERC20', name: 'src', type: 'address' },
            { internalType: 'uint256', name: 'srcAmount', type: 'uint256' },
            { internalType: 'contract IERC20', name: 'dest', type: 'address' },
            {
                internalType: 'uint256',
                name: 'minConversionRate',
                type: 'uint256',
            },
        ],
        name: 'swapTokenToToken',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            { internalType: 'contract IERC20', name: 'src', type: 'address' },
            { internalType: 'uint256', name: 'srcAmount', type: 'uint256' },
            { internalType: 'contract IERC20', name: 'dest', type: 'address' },
            {
                internalType: 'address payable',
                name: 'destAddress',
                type: 'address',
            },
            { internalType: 'uint256', name: 'maxDestAmount', type: 'uint256' },
            {
                internalType: 'uint256',
                name: 'minConversionRate',
                type: 'uint256',
            },
            {
                internalType: 'address payable',
                name: 'platformWallet',
                type: 'address',
            },
        ],
        name: 'trade',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'payable',
        type: 'function',
    },
    {
        inputs: [
            { internalType: 'contract ERC20', name: 'src', type: 'address' },
            { internalType: 'uint256', name: 'srcAmount', type: 'uint256' },
            { internalType: 'contract ERC20', name: 'dest', type: 'address' },
            {
                internalType: 'address payable',
                name: 'destAddress',
                type: 'address',
            },
            { internalType: 'uint256', name: 'maxDestAmount', type: 'uint256' },
            {
                internalType: 'uint256',
                name: 'minConversionRate',
                type: 'uint256',
            },
            {
                internalType: 'address payable',
                name: 'walletId',
                type: 'address',
            },
            { internalType: 'bytes', name: 'hint', type: 'bytes' },
        ],
        name: 'tradeWithHint',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'payable',
        type: 'function',
    },
    {
        inputs: [
            { internalType: 'contract IERC20', name: 'src', type: 'address' },
            { internalType: 'uint256', name: 'srcAmount', type: 'uint256' },
            { internalType: 'contract IERC20', name: 'dest', type: 'address' },
            {
                internalType: 'address payable',
                name: 'destAddress',
                type: 'address',
            },
            { internalType: 'uint256', name: 'maxDestAmount', type: 'uint256' },
            {
                internalType: 'uint256',
                name: 'minConversionRate',
                type: 'uint256',
            },
            {
                internalType: 'address payable',
                name: 'platformWallet',
                type: 'address',
            },
            {
                internalType: 'uint256',
                name: 'platformFeeBps',
                type: 'uint256',
            },
            { internalType: 'bytes', name: 'hint', type: 'bytes' },
        ],
        name: 'tradeWithHintAndFee',
        outputs: [
            { internalType: 'uint256', name: 'destAmount', type: 'uint256' },
        ],
        stateMutability: 'payable',
        type: 'function',
    },
    {
        inputs: [
            { internalType: 'address', name: 'newAdmin', type: 'address' },
        ],
        name: 'transferAdmin',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            { internalType: 'address', name: 'newAdmin', type: 'address' },
        ],
        name: 'transferAdminQuickly',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            { internalType: 'uint256', name: 'amount', type: 'uint256' },
            {
                internalType: 'address payable',
                name: 'sendTo',
                type: 'address',
            },
        ],
        name: 'withdrawEther',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            { internalType: 'contract IERC20', name: 'token', type: 'address' },
            { internalType: 'uint256', name: 'amount', type: 'uint256' },
            { internalType: 'address', name: 'sendTo', type: 'address' },
        ],
        name: 'withdrawToken',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
];
const kyberNetProxyContract = new web3.eth.Contract(
    kyberNetProxyABI,
    kyberNetProxyAddress
);

// Generic ERC20 ABI
const ERC20_ABI = [
    {
        constant: true,
        inputs: [],
        name: 'mintingFinished',
        outputs: [{ name: '', type: 'bool' }],
        payable: false,
        stateMutability: 'view',
        type: 'function',
    },
    {
        constant: true,
        inputs: [],
        name: 'name',
        outputs: [{ name: '', type: 'string' }],
        payable: false,
        stateMutability: 'view',
        type: 'function',
    },
    {
        constant: false,
        inputs: [
            { name: '_spender', type: 'address' },
            { name: '_value', type: 'uint256' },
        ],
        name: 'approve',
        outputs: [{ name: '', type: 'bool' }],
        payable: false,
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        constant: false,
        inputs: [{ name: '_token', type: 'address' }],
        name: 'reclaimToken',
        outputs: [],
        payable: false,
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        constant: true,
        inputs: [],
        name: 'totalSupply',
        outputs: [{ name: '', type: 'uint256' }],
        payable: false,
        stateMutability: 'view',
        type: 'function',
    },
    {
        constant: false,
        inputs: [
            { name: '_from', type: 'address' },
            { name: '_to', type: 'address' },
            { name: '_value', type: 'uint256' },
        ],
        name: 'transferFrom',
        outputs: [{ name: '', type: 'bool' }],
        payable: false,
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        constant: true,
        inputs: [],
        name: 'decimals',
        outputs: [{ name: '', type: 'uint8' }],
        payable: false,
        stateMutability: 'view',
        type: 'function',
    },
    {
        constant: false,
        inputs: [],
        name: 'unpause',
        outputs: [],
        payable: false,
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        constant: false,
        inputs: [
            { name: '_to', type: 'address' },
            { name: '_amount', type: 'uint256' },
        ],
        name: 'mint',
        outputs: [{ name: '', type: 'bool' }],
        payable: false,
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        constant: false,
        inputs: [{ name: 'value', type: 'uint256' }],
        name: 'burn',
        outputs: [],
        payable: false,
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        constant: false,
        inputs: [],
        name: 'claimOwnership',
        outputs: [],
        payable: false,
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        constant: true,
        inputs: [],
        name: 'paused',
        outputs: [{ name: '', type: 'bool' }],
        payable: false,
        stateMutability: 'view',
        type: 'function',
    },
    {
        constant: false,
        inputs: [
            { name: '_spender', type: 'address' },
            { name: '_subtractedValue', type: 'uint256' },
        ],
        name: 'decreaseApproval',
        outputs: [{ name: 'success', type: 'bool' }],
        payable: false,
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        constant: true,
        inputs: [{ name: '_owner', type: 'address' }],
        name: 'balanceOf',
        outputs: [{ name: '', type: 'uint256' }],
        payable: false,
        stateMutability: 'view',
        type: 'function',
    },
    {
        constant: false,
        inputs: [],
        name: 'renounceOwnership',
        outputs: [],
        payable: false,
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        constant: false,
        inputs: [],
        name: 'finishMinting',
        outputs: [{ name: '', type: 'bool' }],
        payable: false,
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        constant: false,
        inputs: [],
        name: 'pause',
        outputs: [],
        payable: false,
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        constant: true,
        inputs: [],
        name: 'owner',
        outputs: [{ name: '', type: 'address' }],
        payable: false,
        stateMutability: 'view',
        type: 'function',
    },
    {
        constant: true,
        inputs: [],
        name: 'symbol',
        outputs: [{ name: '', type: 'string' }],
        payable: false,
        stateMutability: 'view',
        type: 'function',
    },
    {
        constant: false,
        inputs: [
            { name: '_to', type: 'address' },
            { name: '_value', type: 'uint256' },
        ],
        name: 'transfer',
        outputs: [{ name: '', type: 'bool' }],
        payable: false,
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        constant: false,
        inputs: [
            { name: '_spender', type: 'address' },
            { name: '_addedValue', type: 'uint256' },
        ],
        name: 'increaseApproval',
        outputs: [{ name: 'success', type: 'bool' }],
        payable: false,
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        constant: true,
        inputs: [
            { name: '_owner', type: 'address' },
            { name: '_spender', type: 'address' },
        ],
        name: 'allowance',
        outputs: [{ name: '', type: 'uint256' }],
        payable: false,
        stateMutability: 'view',
        type: 'function',
    },
    {
        constant: true,
        inputs: [],
        name: 'pendingOwner',
        outputs: [{ name: '', type: 'address' }],
        payable: false,
        stateMutability: 'view',
        type: 'function',
    },
    {
        constant: false,
        inputs: [{ name: 'newOwner', type: 'address' }],
        name: 'transferOwnership',
        outputs: [],
        payable: false,
        stateMutability: 'nonpayable',
        type: 'function',
    },
    { anonymous: false, inputs: [], name: 'Pause', type: 'event' },
    { anonymous: false, inputs: [], name: 'Unpause', type: 'event' },
    {
        anonymous: false,
        inputs: [
            { indexed: true, name: 'burner', type: 'address' },
            { indexed: false, name: 'value', type: 'uint256' },
        ],
        name: 'Burn',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            { indexed: true, name: 'to', type: 'address' },
            { indexed: false, name: 'amount', type: 'uint256' },
        ],
        name: 'Mint',
        type: 'event',
    },
    { anonymous: false, inputs: [], name: 'MintFinished', type: 'event' },
    {
        anonymous: false,
        inputs: [{ indexed: true, name: 'previousOwner', type: 'address' }],
        name: 'OwnershipRenounced',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            { indexed: true, name: 'previousOwner', type: 'address' },
            { indexed: true, name: 'newOwner', type: 'address' },
        ],
        name: 'OwnershipTransferred',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            { indexed: true, name: 'owner', type: 'address' },
            { indexed: true, name: 'spender', type: 'address' },
            { indexed: false, name: 'value', type: 'uint256' },
        ],
        name: 'Approval',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            { indexed: true, name: 'from', type: 'address' },
            { indexed: true, name: 'to', type: 'address' },
            { indexed: false, name: 'value', type: 'uint256' },
        ],
        name: 'Transfer',
        type: 'event',
    },
];

// this checks and prints the exchange rates between 2 DEXES for any 2 tokens
async function checkPairProfitable(args) {
    const {
        inputTokenSymbol,
        inputTokenAddress,
        outputTokenSymbol,
        outputTokenAddress,
        inputAmount,
    } = args;

    // fetch decimal of token to get precise outputs
    let outputTokenContract = new web3.eth.Contract(
        ERC20_ABI,
        outputTokenAddress
    );
    let outputTokenDecimal = await outputTokenContract.methods.decimals
        .call()
        .call();

    let inputTokenContract = new web3.eth.Contract(
        ERC20_ABI,
        inputTokenAddress
    );
    let inputTokenDecimal = await inputTokenContract.methods.decimals
        .call()
        .call();

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
            inputAmount,
            0
        )
        .call();
    let kyberResult = await kyberNetProxyContract.methods
        .getExpectedRate(inputTokenAddress, outputTokenAddress, inputAmount)
        .call();
    // 120224367254907314
    // 120203917903719052
    const unires = uniswapResult / 10 ** outputTokenDecimal;
    const inputAmountEther = web3.utils.fromWei(inputAmount, 'Ether');
    const intKyberExpectedRate =
        Number(web3.utils.fromWei(kyberResult.expectedRate)) *
        Number(inputAmountEther);
    const intKyberWorstRate =
        Number(web3.utils.fromWei(kyberResult.worstRate)) *
        Number(inputAmountEther);

    const intUniswapResult = +uniswapResult;
    const rate = (intKyberWorstRate - unires) / (intKyberWorstRate + unires);
    // print in form of table
    console.table([
        {
            // 110123070814384276  1091342886656151522  10688428947410018490
            // 120200941374338495  120200831215575705   120199729639056849
            'Input Token': inputTokenSymbol,
            'Output Token': outputTokenSymbol,
            'Input Amount': inputAmountEther,
            'Uniswap Return': unires,
            'Kyber Expected Rate': intKyberExpectedRate,
            'Kyber Min Return': intKyberWorstRate,
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
            1500
        );
}

let priceMonitor;
let monitoringPrice = false;
const addresses = {
    WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    MKR: '0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2',
    WBTC: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
    COMP: '0xc00e94cb662c3520282e6f5717214004a7f26888',
    UNI: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
};
const inputAmount = web3.utils.toWei('100', 'ETHER');
async function monitorPrice() {
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
                inputAmount,
            },
        ].forEach(async (i) => {
            // ADD YOUR CUSTOM TOKEN PAIRS HERE!!!
            await checkPairProfitable(i);
        });
    } catch (error) {
        console.error(error);
        monitoringPrice = false;
        clearInterval(priceMonitor);
        return;
    }

    monitoringPrice = false;
}

const provider = new ethers.providers.InfuraProvider(
    // 'mainnet',
    'ropsten',
    process.env.INFURA_KEY
);
const privateKey = process.env.PRIVATE_KEY;
const wallet = new ethers.Wallet(privateKey, provider);

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

    const contract = new ethers.Contract(
        '0x396c5d786ADB2eb78C0dfa7BC2219dA0aF3E851F',
        FlashSwaps.abi,
        wallet
    );

    const DECIMALS = 18;

    let swapingPairToken;
    let borrowingToken;
    swapingPairToken = new ethers.Contract(
        swapingPairTokenAddress,
        IERC20.abi,
        wallet
    );
    borrowingToken = new ethers.Contract(
        borrowingTokenAddress,
        IERC20.abi,
        wallet
    );

    const initialBalance = await getErc20Balance(
        borrowingToken,
        WalletAddress,
        DECIMALS
    );
    console.log("deployer's initial balance", initialBalance);

    // 然后调用initFlash 函数执行flash swaps,该函数启动 flash 交换过程
    // 它从uninswap的 token0/token1 池中借入数量为 amount0 的 token0 ，池费为 fee1
    // 在这种情况下，它让你的合约以 0.05% 的费用从 DAI/USDC 池中借入 1,500 DAI 。
    console.log('contract.initFlash')
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
            // Every Contract method may take one additional (optional) parameter which specifies the transaction (or call) overrides
            // The maximum units of gas for the transaction to use
            gasLimit: 100_0000,

            // The price (in wei) per unit of gas
            gasPrice: ethers.utils.parseUnits('100', 'gwei'),
        }
    );
    console.log({tx})
    // 执行到了 FlashSwap.sol

    const endingBalance = await getErc20Balance(
        borrowingToken,
        WalletAddress,
        DECIMALS
    );
    console.log("deployer's ending balance", endingBalance);

    const profit = endingBalance - initialBalance;

    if (profit > 0) {
        console.log(`Congrats! You earned ${profit} DAI !!`);
    }
}

// Check markets every n seconds
// const POLLING_INTERVAL = Number(process.env.POLLING_INTERVAL) || 1000; // 1 Second
// priceMonitor = setInterval(async () => {
//     await monitorPrice();
// }, POLLING_INTERVAL);

(async () => {
    await callFlashContract(DAI, UNI, false, 1500);
})();

// monitorPrice -> checkPairProfitable -> callFlashContract
