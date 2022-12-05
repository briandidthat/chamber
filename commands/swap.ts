import Swapper from "../lib/Swapper";

const swapCommands = {
  async findBestQuote(sellToken: string, buyToken: string, amount: string) {
    const quote = await Swapper.findBestQuote(sellToken, buyToken, amount);
    console.log(quote);
  },
  async swap(
    sellToken: string,
    buyToken: string,
    amount: string,
    network: string
  ) {
    const swap = await Swapper.executeSwap(
      sellToken,
      buyToken,
      amount,
      network
    );
    console.log(swap);
  },
};

export default swapCommands;
