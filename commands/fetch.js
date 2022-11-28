const PriceFetcher = require("../lib/PriceFetcher");

const fetch = {
    async getPrice(ticker) {
        const response = await PriceFetcher.getPrice(ticker);
        console.log(response);
    }
}

module.exports = fetch;