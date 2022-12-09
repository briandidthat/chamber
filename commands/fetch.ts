import PriceFetcher from "../lib/Fetcher";
import { fromBn } from "../utils";

const fetcher = {
  async getPrice(ticker: string) {
    const response = await PriceFetcher.getPrice(ticker);
    console.log(response);
  },
  async getBalance() {
    const balance = await PriceFetcher.getBalance();
    console.log(fromBn(balance));
  },
};

export default fetcher;
