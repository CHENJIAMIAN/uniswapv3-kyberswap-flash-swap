// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity =0.7.6;
pragma abicoder v2;

import "@uniswap/v3-core/contracts/interfaces/callback/IUniswapV3FlashCallback.sol";
import "@uniswap/v3-core/contracts/libraries/LowGasSafeMath.sol";

import "../contracts/interfaces/IDMMRouter02.sol";
import "../contracts/interfaces/IDMMFactory.sol";
import "@uniswap/v3-periphery/contracts/base/PeripheryPayments.sol";
import "@uniswap/v3-periphery/contracts/base/PeripheryImmutableState.sol";
import "@uniswap/v3-periphery/contracts/libraries/PoolAddress.sol";
import "@uniswap/v3-periphery/contracts/libraries/CallbackValidation.sol";
import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "hardhat/console.sol";

import "./Base.sol";

contract FlashSwaps is
    IUniswapV3FlashCallback,
    PeripheryImmutableState,
    PeripheryPayments,
    Base
{
    using LowGasSafeMath for uint256;
    using LowGasSafeMath for int256;

    IDMMRouter02 public dmmRouter;
    IDMMFactory public dmmFactory;

    ISwapRouter public immutable swapRouter;
    address internal WETH;
    uint256 amountOutMin;

    constructor(
        ISwapRouter _swapRouter,
        address _factory,
        address _WETH9,
        IDMMRouter02 _dmmRouter,
        IDMMFactory _dmmFactory,
        uint256 _amountOutMin
    ) PeripheryImmutableState(_factory, _WETH9) {
        amountOutMin = _amountOutMin;
        swapRouter = _swapRouter;
        dmmRouter = _dmmRouter;
        dmmFactory = _dmmFactory;
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

        if (decoded.unikyb) {
            // ??????false ????????????
            uint256 amountOut0 = swapOnUniswap(
                decoded.amount0, //1500
                token0, //DAI
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
            // ??????????????????

            // ???????????? 1,500 DAI ????????????????????? 1,500 DAI ?????? kyber ???????????? UNI???
            uint256 amountOut0 = swapOnKyber(
                decoded.amount0,
                token0,
                decoded.target
            );

            // ???????????? 55.66 UNI ?????????????????? Uniswap DAI/ETH 0.05% ?????? UNI/ETH 0.05% ?????? DAI???
            uint256 amountOut1 = swapOnUniswap(
                amountOut0, //55.66
                decoded.target, //token2 UNI
                token0, //DAI
                decoded.poolFee2 //500
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

    // ?????????????????????????????????????????????????????????
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

        if (amount0Owed > 0)
            // ????????? ?????? ???????????????????????????
            // ?????????????????????????????????????????? 1,500 DAI * (1 + 0.05%) = 1,500.75 DAI
            // ???????????????????????????????????????????????????????????????????????????????????????
            pay(token0, address(this), msg.sender, amount0Owed);
        if (amount1Owed > 0)
            pay(token1, address(this), msg.sender, amount1Owed);

        if (amountOut1 > amount0Owed) {
            uint256 profit1 = LowGasSafeMath.sub(amountOut1, amount0Owed);
            TransferHelper.safeApprove(token0, address(this), profit1);
            // ???????????????????????????????????????
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
            // ?????????amountIn??????????????????????????????????????????
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
                        inputToken, //UNI
                        poolFee, //500
                        WETH,
                        poolFee,
                        outputToken //DAI
                    ),
                    recipient: address(this),
                    deadline: block.timestamp + 200,
                    amountIn: amountIn, //55.66
                    amountOutMinimum: 0
                });
            // amountIn?????????????????????????????????????????????????????????????????????
            amountOut = swapRouter.exactInput(params);
        }
    }

    function swapOnKyber(
        uint256 amountIn,
        address inputToken,
        address outputToken
    ) internal returns (uint256 amountOut) {
        TransferHelper.safeApprove(inputToken, address(dmmRouter), amountIn);
        IERC20[] memory path = new IERC20[](2);
        path[0] = IERC20(inputToken); // assuming usdc is specified as IERC20
        path[1] = IERC20(outputToken); // assuming wbtc is specified as IERC20
        address poolAddress = dmmFactory.getUnamplifiedPool(//????????????????????????pool
            IERC20(inputToken),
            IERC20(outputToken)
        );
        // use unamplified pool
        address[] memory poolsPath = new address[](1);
        poolsPath[0] = poolAddress;
        console.log("amountIn:%s", amountIn);
        console.log("amountOutMin:%s", amountOutMin);
        console.log("poolAddress:%s", poolAddress);
        console.log("msg.sender:%s", msg.sender);
        console.log("deadline:%s", block.timestamp + 100);
        // try
        uint256[] memory amounts = dmmRouter.swapExactTokensForTokens(
            amountIn,
            amountOutMin,
            poolsPath, //address[] calldata poolsPath,//// eg. [usdc-wbtc-pool, wbtc-weth-pool]//poolsPath.length = path.length - 1
            path, //IERC20[] calldata path,
            msg.sender, //address to,
            block.timestamp + 100 // uint256 deadline
        );
        amountOut = amounts[amounts.length - 1];
        // returns (uint256[] memory amounts) {
        //     amountOut = amounts[amounts.length - 1];
        // } catch {
        //     revert("swapExactTokensForTokens ERROR");
        // }
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
            @notice?????? token0 ???/??? token1 ??????????????????????????????????????????
            @dev ???????????????????????? IUniswapV3FlashCallback#uniswapV3FlashCallback ?????????????????????
            @dev ??????????????????????????????????????????????????????????????????????????????????????????
            ?????? amount0{0???1} ??????????????????????????????
            
            @param????????? ????????? token0 ??? token1 ???????????????
            @param??????0 ???????????? token0 ??????
            @param??????1 ????????????????????????1
            @param?????? ?????????????????????????????????
        */

        // ??????????????????1500dai???
        pool.flash(
            address(this),
            params.amount0, //1500
            params.amount1, //0
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
