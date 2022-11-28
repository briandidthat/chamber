const Swapper = require("../lib/Swapper");

const swapCommands = {
    async findBestQuote(sellToken, buyToken, amount) {
        console.log(`Finding best quote for ${sellToken} -> ${buyToken} swap. Sell amount: ${amount}`);
        const quote = await Swapper.findBestQuote(sellToken, buyToken, amount);
        console.log(quote);
    },
    async swap(sellToken, buyToken, amount, network) {
        console.log(`Swapping ${amount} ${sellToken} to ${buyToken}`);
        const swap = await Swapper.executeSwap(sellToken, buyToken, amount, network);
        console.log(swap);
    }
}

module.exports = swapCommands;