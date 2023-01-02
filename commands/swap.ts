import colors from "colors";
import Swapper from "../lib/Swapper";
import { ChainId, fromBn } from "../utils";

const swapper = new Swapper(ChainId.MAINNET);

const swapCommands = {
  async findBestQuote(sellToken: string, buyToken: string, amount: string) {
    const quote = await swapper.fetchBestQuote(sellToken, buyToken, amount);
    console.log(
      colors.green(
        `Best Quote: ${quote.liquiditySource}. Expected output: ${fromBn(
          quote.expectedOutput
        )} ${quote.buyToken.symbol}`
      )
    );
  },
  async swap(sellToken: string, buyToken: string, amount: string) {
    const network = swapper.getNetwork();
    const swap = await swapper.executeSwap(sellToken, buyToken, amount);
    if (swap !== undefined) {
      console.log(
        colors.green(
          `Tx executed. View transaction @ ${network.scanner}/tx/${swap.hash}`
        )
      );
    }
  },
};

export default swapCommands;
