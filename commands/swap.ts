import { ethers } from "ethers";
import colors from "colors";
import Swapper from "../lib/Swapper";
import keyManager from "../lib/KeyManager";

const provider = new ethers.providers.JsonRpcProvider(
  keyManager.get("CURRENT_NETWORK")
);
const signer = new ethers.Wallet(keyManager.get("PRIVATE_KEY"), provider);
const swapper = new Swapper(provider, signer);

const swapCommands = {
  async findBestQuote(sellToken: string, buyToken: string, amount: string) {
    const quote = await swapper.fetchBestQuote(sellToken, buyToken, amount);
    console.log(colors.green(`Best Quote: ${quote.liquiditySource}`));
  },
  async swap(sellToken: string, buyToken: string, amount: string) {
    const swap = await swapper.executeSwap(sellToken, buyToken, amount);
    console.log(
      `Swap executed. View transaction @ https://etherscan.io/tx/${swap?.hash}`
    );
  },
};

export default swapCommands;
