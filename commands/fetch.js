const PriceFetcher = require("../lib/PriceFetcher");

const fetch = {
    async getPrice(ticker) {
        const response = await PriceFetcher.getPrice(ticker);
        console.log(response);
    },
    async getQuote(sellToken, buyToken, amount) {
        console.log(sellToken, buyToken, amount)
        const quote = await PriceFetcher.findBestQuote(sellToken, buyToken, amount);
        console.log(quote);
    }
}

module.exports = fetch;