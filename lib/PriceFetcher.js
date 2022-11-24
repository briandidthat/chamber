const axios = require("axios");
const {getTokenAddress} = require("../utils")

class PriceFetcher {
    static binanceUrl = "https://api1.binance.com/api/v3/ticker/price?";
    static oneInchUrl = "https://api.1inch.io/v5.0/1/quote?";
    static zeroXUrl = "https://api.0x.org/swap/v1/quote?";

    static async getPrice(ticker) {
        try {
            const response = await axios.get(`${this.binanceUrl}symbol=${ticker}USDT`);
            return response.data;
        } catch (err) {
            console.error(err);
        }
    }

    static async findBestQuote(sellToken, buyToken, amount) {
        const sellTokenAddress = getTokenAddress(sellToken);
        const buyTokenAddress = getTokenAddress(buyToken);

        try {
            const zeroXQoute = await axios.get(`${this.zeroXUrl}sellToken=${sellToken}&buyToken=${buyToken}&sellAmount=${amount}`);
            const oneInchQoute = await axios.get(`${this.oneInchUrl}fromTokenAddress=${sellTokenAddress}&toTokenAddress=${buyTokenAddress}&amount=${amount}`);

            const zeroXData = zeroXQoute.data;
            const oneInchData = oneInchQoute.data;

            const zeroXAmount = zeroXData.buyAmount;
            const oneInchAmount = oneInchData.toTokenAmount;

            console.log("ZeroXAmount: " + zeroXAmount);
            console.log("OneInchAmount: " + oneInchAmount);

            return zeroXAmount > oneInchAmount ? zeroXData : oneInchData;
        } catch (err) {
            console.error(err);
        }
    }
}


module.exports = PriceFetcher;