import axios from "axios";
import { ethers, providers } from "ethers";
import { createQueryString } from "../utils";
import keyManager from "./KeyManager";
import { BinanceResponse } from "./types";

class Fetcher {
  static binanceUrl = "https://api1.binance.com/api/v3/ticker/";

  static async getPrice(ticker: string) {
    try {
      const response = await axios.get<BinanceResponse>(
        createQueryString(this.binanceUrl, "/price", { symbol: ticker }) +
          "USDT"
      );
      return response.data;
    } catch (err) {
      console.error(err);
    }
  }

  static async getBalance() {
    const alchemyUrl = keyManager.get("ALCHEMY_RPC_URL");
    const privateKey = keyManager.get("PRIVATE_KEY");
    const provider = new providers.JsonRpcProvider(alchemyUrl);
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log(wallet.address);

    return await provider.getBalance(wallet.address);
  }
}

export default Fetcher;
