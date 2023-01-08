import PriceFetcher from "../lib/Fetcher";

const fetcher = {
  async getPrice(ticker: string) {
    const response = await PriceFetcher.getPrice(ticker);
    console.log(`${ticker} price in USD: ${response}`);
  },
};

export default fetcher;
