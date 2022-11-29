const keyManager = require("../lib/KeyManager");

const TOKEN_MAP = {
    ETH: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    DAI: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    USDC: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    USDT: "0xdac17f958d2ee523a2206206994597c13d831ec7",
    WETH: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
    WBTC: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599"
}

const LIQUIDITY_SOURCES = {
    PARASWAP: "paraswap",
    ZERO_X: "0x",
    ONE_INCH: "1inch"
}

const NETWORK_MAP = {
//    mainnet: keyManager.get("MAINNET_URL"),
    localhost: "http://127.0.0.1:8545"
}

const getTokenAddress = (ticker) => {
    const address = TOKEN_MAP[ticker.toUpperCase()];
    if (!ticker) throw new Error("that token is not supported");
    return address;
}

const getNetworkUrl = (network) => {
    const networkUrl = NETWORK_MAP[network.toLowerCase()];
    if (!networkUrl) throw new Error("provided network is not supported");
    return networkUrl;
}

function createQueryString(url, path, params) {
    return url + path + "?" + (new URLSearchParams(params)).toString();
}


module.exports = {createQueryString, getNetworkUrl, getTokenAddress, LIQUIDITY_SOURCES};