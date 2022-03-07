const FlashSwaps = artifacts.require('FlashSwaps');
import {
    DAI,
    KYBER_ADDRESS,
    SWAP_ROUTER,
    UNI,
    uniswapv3factory,
    USDC,
    weth9,
} from './address';

module.exports = function (deployer) {
    deployer.deploy(
        FlashSwaps,
        SWAP_ROUTER,
        uniswapv3factory,
        ethers.utils.getAddress(weth9),
        KYBER_ADDRESS
    );
};
