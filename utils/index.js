const TOKEN_MAP = {
    ETH: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    DAI: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    USDC: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    USDT: "0xdac17f958d2ee523a2206206994597c13d831ec7",
    WETH: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
}


const getTokenAddress = (ticker) => {
    ticker = ticker.toUpperCase();
    for (let entry of Object.entries(TOKEN_MAP)) {
        let [key, val] = entry;
        if (ticker === key) return val;
    }
    throw new Error("that token is not supported");
}

module.exports = {getTokenAddress};