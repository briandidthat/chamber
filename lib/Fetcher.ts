import axios from "axios";
import { createQueryString } from "../utils";

class Fetcher {
  static coinbaseUrl = "https://api.coinbase.com/v2";

  static async getExchangeRate(ticker: string) {
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

  static async getPrice(ticker: string) {
    try {
      const response = (
        await axios.get(
          `${this.coinbaseUrl}/prices/${ticker}-USD/buy`
        )
      ).data;
      return response.data.amount;
    } catch (err) {
      console.error(err);
    }
  }
}

export default Fetcher;
