import { getSpotPrice } from "../utils";

const fetcher = {
  async getPrice(ticker: string) {
    const response = await getSpotPrice(ticker);
    console.log(`${ticker} spot price: ${response}`);
  },
};

export default fetcher;
