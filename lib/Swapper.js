const axios = require("axios");
const keyManager = require("../lib/KeyManager");
const {getTokenAddress, createQueryString} = require("../utils")

class Swapper {
    static oneInchUrl = "https://api.1inch.io/v5.0/1/";
    static zeroXUrl = "https://api.0x.org/swap/v1/";

    static async prepareOneInchSwapData(sellToken, buyToken, amount, fromAddress) {
        const fromTokenAddress = getTokenAddress(sellToken);
        const toTokenAddress = getTokenAddress(buyToken);

        try {
            const swapData = await axios.get(createQueryString(this.oneInchUrl + "swap?", {
                fromTokenAddress: fromTokenAddress,
                toTokenAddress: toTokenAddress,
                amount: amount,
                fromAddress: fromAddress === "" ? keyManager.get("signer") : fromAddress,
                slippage: "1"
            }));
            return swapData.data;
        } catch (err) {
            console.error(err);
        }
    }

    static async executeSwap() {
        
    }

    static async findBestQuote(sellToken, buyToken, amount) {
        const fromTokenAddress = getTokenAddress(sellToken);
        const toTokenAddress = getTokenAddress(buyToken);

        try {
            const zeroXQoute = await axios.get(createQueryString(this.zeroXUrl + "quote?", {
                sellToken: sellToken,
                buyToken: buyToken,
                sellAmount: amount
            }));
            const oneInchQoute = await axios.get(createQueryString(this.oneInchUrl + "quote?", {
                fromTokenAddress: fromTokenAddress,
                toTokenAddress: toTokenAddress,
                amount: amount
            }));

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

module.exports = Swapper;