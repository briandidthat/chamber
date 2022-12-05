import PriceFetcher from "../lib/PriceFetcher";

const fetcher = {
  async getPrice(ticker: string) {
    const response = await PriceFetcher.getPrice(ticker);
    console.log(response);
  },
};

export default fetcher;
