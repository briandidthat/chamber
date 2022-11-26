const axios = require("axios");
const {createQueryString} = require("../utils")

class PriceFetcher {
    static binanceUrl = "https://api1.binance.com/api/v3/ticker/price?";

    static async getPrice(ticker) {
        try {
            const response = await axios.get(createQueryString(this.binanceUrl, {symbol: ticker}) + "USDT");
            return response.data;
        } catch (err) {
            console.error(err);
        }
    }
}


module.exports = PriceFetcher;