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

    static async findBestQoute(sellToken, buyToken, amount) {
        const sellTokenAddress = getTokenAddress(sellToken);
        const buyTokenAddress = getTokenAddress(buyToken);

        const zeroXQoute = await axios.get(`${this.zeroXUrl}sellToken=${sellToken}&buyToken=${buyToken}&sellAmount=${amount}`);
        const oneInchQoute = await axios.get(`${this.oneInchUrl}fromTokenAddress=${sellTokenAddress}&toTokenAddress=${buyTokenAddress}&amount=${amount}`);
        const zeroXAmount = zeroXQoute.data.buyAmount;
        const oneInchAmount = oneInchQoute.data.toTokenAmount;

        return zeroXAmount > oneInchAmount ? zeroXQoute.data : oneInchQoute.data;
    }
}


module.exports = PriceFetcher;