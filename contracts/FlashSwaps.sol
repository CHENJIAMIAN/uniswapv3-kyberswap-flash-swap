// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity =0.7.6;
pragma abicoder v2;

import "@uniswap/v3-core/contracts/interfaces/callback/IUniswapV3FlashCallback.sol";
import "@uniswap/v3-core/contracts/libraries/LowGasSafeMath.sol";

import {KyberNetworkProxy as IKyberNetworkProxy} from "./interfaces/kyber/KyberNetworkProxy.sol";
import "@uniswap/v3-periphery/contracts/base/PeripheryPayments.sol";
import "@uniswap/v3-periphery/contracts/base/PeripheryImmutableState.sol";
import "@uniswap/v3-periphery/contracts/libraries/PoolAddress.sol";
import "@uniswap/v3-periphery/contracts/libraries/CallbackValidation.sol";
import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "./Base.sol";



contract FlashSwaps is
    IUniswapV3FlashCallback,
    PeripheryImmutableState,
    PeripheryPayments,
    Base
{
    using LowGasSafeMath for uint256;
    using LowGasSafeMath for int256;

    IKyberNetworkProxy kyber;
    ISwapRouter public immutable swapRouter;
    address internal WETH;

    constructor(
        ISwapRouter _swapRouter,
        address _factory,
        address _WETH9,
        address kyberAddress
    ) PeripheryImmutableState(_factory, _WETH9) {
        swapRouter = _swapRouter;
        kyber = IKyberNetworkProxy(kyberAddress);
        WETH = _WETH9;
    }

    function uniswapV3FlashCallback(
        uint256 fee0,
        uint256 fee1,
        bytes calldata data
    ) external override {
        FlashCallbackData memory decoded = abi.decode(
            data,
            (FlashCallbackData)
        );
        CallbackValidation.verifyCallback(factory, decoded.poolKey);

        address token0 = decoded.poolKey.token0;
        address token1 = decoded.poolKey.token1;

        // 在 kyber 网络协议上交换 DAI 为 UNI
        // 合约借入 1,500 DAI 后，合约执行 uniswapV3FlashCallback 函数。
        // 首先，它将 1,500 DAI 换成 kyber 协议上的 UNI。
        if (decoded.unikyb) {
            uint256 amountOut0 = swapOnUniswap(
                decoded.amount0,
                token0,
                decoded.target,
                decoded.poolFee2
            );

            uint256 amountOut1 = swapOnKyber(
                amountOut0,
                decoded.target,
                token0
            );

            payback(
                decoded.amount0,
                decoded.amount1,
                fee0,
                fee1,
                token0,
                token1,
                amountOut1,
                decoded.payer
            );
        } else {
            uint256 amountOut0 = swapOnKyber(
                decoded.amount0,
                token0,
                decoded.target
            );

            // 在 Uniswap 上将 UNI 换成 DAI
            // 合约获得 55.66 UNI 并将它们换成 Uniswap DAI/ETH 0.05% 池和 UNI/ETH 0.05% 池的 DAI。
            uint256 amountOut1 = swapOnUniswap(
                amountOut0,
                decoded.target,
                token0,
                decoded.poolFee2
            );

            payback(
                decoded.amount0,
                decoded.amount1,
                fee0,
                fee1,
                token0,
                token1,
                amountOut1,
                decoded.payer
            );
        }
    }

    // 偿还借入的金额并将利润发送到部署者地址
    function payback(
        uint256 amount0,
        uint256 amount1,
        uint256 fee0,
        uint256 fee1,
        address token0,
        address token1,
        uint256 amountOut1,
        address payer
    ) internal {
        uint256 amount0Owed = LowGasSafeMath.add(amount0, fee0);
        uint256 amount1Owed = LowGasSafeMath.add(amount1, fee1);

        TransferHelper.safeApprove(token0, address(this), amount0Owed);
        TransferHelper.safeApprove(token1, address(this), amount1Owed);

        // 合约用 池费 偿还你借入的金额，
        // 所以在这种情况下，合约将支付 1,500 DAI * (1 + 0.05%) = 1,500.75 DAI
        if (amount0Owed > 0)
            pay(token0, address(this), msg.sender, amount0Owed);
        if (amount1Owed > 0)
            pay(token1, address(this), msg.sender, amount1Owed);

        // 如果合约没有足够的金额来偿还借入的金额，则整个交易将被撤销
        if (amountOut1 > amount0Owed) {
            uint256 profit1 = LowGasSafeMath.sub(amountOut1, amount0Owed);
            TransferHelper.safeApprove(token0, address(this), profit1);
            pay(token0, address(this), payer, profit1);
        }
    }

    function swapOnUniswap(
        uint256 amountIn,
        address inputToken,
        address outputToken,
        uint24 poolFee
    ) internal returns (uint256 amountOut) {
        TransferHelper.safeApprove(inputToken, address(swapRouter), amountIn);

        if (inputToken == WETH || outputToken == WETH) {
            amountOut = swapRouter.exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: inputToken,
                    tokenOut: outputToken,
                    fee: poolFee,
                    recipient: address(this),
                    deadline: block.timestamp + 200,
                    amountIn: amountIn,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                })
            );
        } else {
            ISwapRouter.ExactInputParams memory params = ISwapRouter
                .ExactInputParams({
                    path: abi.encodePacked(
                        inputToken,
                        poolFee,
                        WETH,
                        poolFee,
                        outputToken
                    ),
                    recipient: address(this),
                    deadline: block.timestamp + 200,
                    amountIn: amountIn,
                    amountOutMinimum: 0
                });

            amountOut = swapRouter.exactInput(params);
        }
    }

    function swapOnKyber(
        uint256 amountIn,
        address inputToken,
        address outputToken
    ) internal returns (uint256 amountOut) {
        (uint256 expectedRate, ) = kyber.getExpectedRate(
            IERC20(inputToken),
            IERC20(outputToken),
            amountIn
        );

        TransferHelper.safeApprove(inputToken, address(kyber), amountIn);
        try
            kyber.swapTokenToToken(
                IERC20(inputToken),
                amountIn,
                IERC20(outputToken),
                expectedRate
            )
        returns (uint256 bal) {
            amountOut = bal;
        } catch {
            revert("KE");
        }
    }

    struct FlashParams {
        address token0;
        address token1;
        address token2;
        uint24 fee1;
        uint256 amount0;
        uint256 amount1;
        uint24 fee2;
        bool unikyb;
    }
    struct FlashCallbackData {
        uint256 amount0;
        uint256 amount1;
        address target;
        address payer;
        PoolAddress.PoolKey poolKey;
        uint24 poolFee2;
        bool unikyb;
    }

    function initFlash(FlashParams memory params) external {
        PoolAddress.PoolKey memory poolKey = PoolAddress.PoolKey({
            token0: params.token0,
            token1: params.token1,
            fee: params.fee1
        });
        IUniswapV3Pool pool = IUniswapV3Pool(
            PoolAddress.computeAddress(factory, poolKey)
        );

        /* 
            @notice接收 token0 和/或 token1 并在回调中偿还，另加一笔费用
            @dev 此方法的调用方以 IUniswapV3FlashCallback#uniswapV3FlashCallback 的形式接收回调
            @dev 可用于通过调用来按比例向当前范围内的流动性提供商捐赠基础代币
            使用 0 金额{0，1} 并从回调发送捐款金额
            
            @param收件人 将接收 token0 和 token1 金额的地址
            @param金额0 要发送的 token0 数量
            @param金额1 要发送的令牌数量1
            @param数据 要传递到回调的任何数据
        */
        pool.flash(
            address(this),
            params.amount0,
            params.amount1,
            abi.encode(
                FlashCallbackData({
                    amount0: params.amount0,
                    amount1: params.amount1,
                    target: params.token2,
                    payer: msg.sender,
                    poolKey: poolKey,
                    poolFee2: params.fee2,
                    unikyb: params.unikyb
                })
            )
        );
    }

    function withdrawToken(
        address token,
        address recipient,
        uint256 value
    ) external onlyOwner noReentrant {
        pay(token, address(this), recipient, value);
    }
}
