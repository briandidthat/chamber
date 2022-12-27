import { Token } from "../lib/types";
import { CHAIN_ID } from "./web3";

const SUPPORTED_TOKENS: Record<number, Token[]> = {
  [CHAIN_ID.MAINNET]: [
    {
      symbol: "ETH",
      address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
      decimals: 18,
    },
    {
      symbol: "DAI",
      address: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
      decimals: 18,
    },
    {
      symbol: "USDC",
      address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
      decimals: 6,
    },
    {
      symbol: "USDT",
      address: "0xdac17f958d2ee523a2206206994597c13d831ec7",
      decimals: 18,
    },
    {
      symbol: "WETH",
      address: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
      decimals: 18,
    },
    {
      symbol: "WBTC",
      address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
      decimals: 18,
    },
  ],
};

export const getTokenDetails = (symbol: string, network: number): Token => {
  const tokens = SUPPORTED_TOKENS[network];
  for (let token of tokens) {
    if (token.symbol === symbol) {
      return token;
    }
  }
  throw new Error(`${symbol} is not a supported token`);
};

export const getTokenPairDetails = (
  sellToken: string,
  buyToken: string,
  network: number
): Token[] => {
  const tokens = SUPPORTED_TOKENS[network];
  let sellTokenDetails,
    buyTokenDetails = undefined;

  for (let token of tokens) {
    if (token.symbol === sellToken) sellTokenDetails = token;
    if (token.symbol === buyToken) buyTokenDetails = token;
  }

  if (sellTokenDetails === undefined || buyTokenDetails === undefined) {
    throw new Error(`${sellToken} -> ${buyToken} is not a supported trade`);
  }
  return [sellTokenDetails, buyTokenDetails];
};
