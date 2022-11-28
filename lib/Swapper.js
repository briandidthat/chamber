const axios = require("axios");
const {ethers} = require("ethers");
const keyManager = require("../lib/KeyManager");
const {getTokenAddress, createQueryString, getNetworkUrl, LIQUIDITY_SOURCES} = require("../utils");

class Swapper {
    static oneInchUrl = "https://api.1inch.io/v5.0/1/";
    static zeroXUrl = "https://api.0x.org/swap/v1/";
    static paraswapUrl = "https://apiv5.paraswap.io/";

    static async getOneInchTxData(quote) {
        try {
            const swapData = await axios.get(createQueryString(this.oneInchUrl + "swap?", {
                fromTokenAddress: quote.fromToken.address,
                toTokenAddress: quote.toToken.address,
                amount: quote.fromTokenAmount,
                fromAddress: keyManager.get("SIGNER"),
                slippage: "1"
            }));
            return swapData.data;
        } catch (err) {
            console.error(err);
        }
    }

    static async getParaswapTxData(quote, networkId) {
        const transaction = {
            srcToken: quote.priceRoute.srcToken,
            destToken: quote.priceRoute.destToken,
            destAmount: quote.priceRoute.destAmount,
            priceRoute: quote.priceRoute,
            userAddress: keyManager.get("SIGNER")
        }

        try {
            const response = await axios.post(`${this.paraswapUrl}/transactions/${networkId}`, transaction);
            return response.data;
        } catch (err) {
            console.error(err);
        }
    }

    static async executeSwap(sellToken, buyToken, amount, network) {
        const fromTokenAddress = getTokenAddress(sellToken);
        const toTokenAddress = getTokenAddress(buyToken);
        const networkUrl = getNetworkUrl(network);
//        const provider = new ethers.providers.JsonRpcProvider(networkUrl);

        try {
            const bestQuote = this.findBestQuote(sellToken, buyToken, amount);
            const txParams = await this.buildSwapParams(bestQuote);

//            console.log(provider.getBalance("0x9D727911B54C455B0071A7B682FcF4Bc444B5596"));

        } catch (err) {
            console.error(err);
        }
    }

    static async findBestQuote(sellToken, buyToken, amount) {
        const fromTokenAddress = getTokenAddress(sellToken);
        const toTokenAddress = getTokenAddress(buyToken);

        try {
            const [zeroXQoute, oneInchQoute, paraswapQoute] = await Promise.all([
                this.fetchOxQuote(sellToken, buyToken, amount),
                this.fetchOneInchQoute(fromTokenAddress, toTokenAddress, amount),
                this.fetchParaSwapQoute(fromTokenAddress, toTokenAddress, amount)]);

            const zeroXAmount = zeroXQoute.buyAmount;
            const oneInchAmount = oneInchQoute.toTokenAmount;
            const paraswapAmount = paraswapQoute.priceRoute.destAmount;

            console.log("ZeroX Amount: " + zeroXAmount);
            console.log("OneInch Amount: " + oneInchAmount);
            console.log("Paraswap Amount: " + paraswapAmount);

            const sorted = [
                {liquiditySource: LIQUIDITY_SOURCES.ZERO_X, amount: zeroXAmount, response: zeroXQoute},
                {liquiditySource: LIQUIDITY_SOURCES.ONE_INCH, amount: oneInchAmount, response: oneInchQoute},
                {liquiditySource: LIQUIDITY_SOURCES.PARASWAP, amount: paraswapAmount, response: paraswapQoute}
            ].sort((a, b) => b - a);

            return sorted[0];
        } catch (err) {
            console.error(err);
        }
    }

    static async fetchOxQuote(sellToken, buyToken, amount) {
        try {
            const zeroXQoute = await axios.get(createQueryString(this.zeroXUrl + "quote?", {
                sellToken: sellToken,
                buyToken: buyToken,
                sellAmount: amount
            }));
            return zeroXQoute.data;
        } catch (err) {
            console.error(err);
        }
    }

    static async fetchOneInchQoute(fromTokenAddress, toTokenAddress, amount) {
        try {
            const oneInchQoute = await axios.get(createQueryString(this.oneInchUrl + "quote?", {
                fromTokenAddress: fromTokenAddress,
                toTokenAddress: toTokenAddress,
                amount: amount
            }));
            return oneInchQoute.data;
        } catch (err) {
            console.error(err);
        }
    }

    static async fetchParaSwapQoute(srcToken, destToken, amount) {
        try {
            const paraswapQoute = await axios.get(createQueryString(this.paraswapUrl + "prices?", {
                srcToken: srcToken,
                destToken: destToken,
                amount: amount,
                side: "SELL",
                network: "1"
            }))
            return paraswapQoute.data;
        } catch (err) {
            console.error(err);
        }

    }

    static async buildSwapParams(quote) {
        switch (quote.liquiditySource) {
            case LIQUIDITY_SOURCES.ONE_INCH:
                return await this.getOneInchTxData(quote);
            case LIQUIDITY_SOURCES.PARASWAP:
                return await this.getParaswapTxData(quote);
            case LIQUIDITY_SOURCES.ZERO_X:
                return quote;
            default:
                throw new Error("Unsupported liquidity source");
        }
    }
}


module.exports = Swapper;