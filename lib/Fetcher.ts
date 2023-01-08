import axios from "axios";
import { ethers, providers } from "ethers";
import { createQueryString } from "../utils";
import keyManager from "./KeyManager";

class Fetcher {
  static coinbaseUrl = "https://api.coinbase.com/v2";

  static async getPrice(ticker: string) {
    try {
      const response = (
        await axios.get(
          createQueryString(this.coinbaseUrl, "/exchange-rates", {
            currency: ticker,
          })
        )
      ).data;
      return response.data.rates["USD"];
    } catch (err) {
      console.error(err);
    }
  }
}

export default Fetcher;
