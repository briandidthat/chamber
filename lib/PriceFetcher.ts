import axios from "axios";
import { createQueryString } from "../utils";
import { BinanceResponse } from "./types";

class PriceFetcher {
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
}

export default PriceFetcher;
