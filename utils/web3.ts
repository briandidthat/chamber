import { BigNumber, FixedNumber } from "@ethersproject/bignumber";
import { Token } from "../lib/types";

const TOKEN_MAP: Record<string, string> = {
  ETH: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
  DAI: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
  USDC: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
  USDT: "0xdac17f958d2ee523a2206206994597c13d831ec7",
  WETH: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
  WBTC: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
};

export enum API_URLS {
  ZERO_X = "https://api.0x.org/swap/v1",
  ONE_INCH = "https://api.1inch.io/v5.0/1",
}

export enum NETWORK {
  MAINNET = 1,
  GOERLI = 5,
  BSC_MAINNET = 56,
  POLYGON = 137,
  FANTOM = 250,
  ARBITRUM = 42161,
  AVALANCHE = 43114,
}

export enum LIQUIDITY_SOURCE {
  PARASWAP = "Paraswap",
  ZERO_X = "0x",
  ONE_INCH = "1inch",
}

const NETWORK_MAP: Record<string, string> = {
  // mainnet: keyManager.get("MAINNET_URL"),
  localhost: "http://127.0.0.1:8545",
};

export const getTokenDetails = (ticker: string): Token => {
  const address = TOKEN_MAP[ticker];
  if (!ticker) throw new Error("that token is not supported");
  return { symbol: "", address, decimals: 18 };
};

export const getNetworkUrl = (network: string) => {
  const networkUrl = NETWORK_MAP[network.toLowerCase()];
  if (!networkUrl) throw new Error("provided network is not supported");
  return networkUrl;
};

/**
 * Creates a query string using the given parameters
 * @param url the base url for the request
 * @param path the target path for the request
 * @param params the parameters for the query string
 * @returns string
 */
export const createQueryString = (
  url: string,
  path: string,
  params: Record<string, any>
) => {
  return url + path + "?" + new URLSearchParams(params).toString();
};

/**
 * Convert a big number with a custom number of decimals to a stringified fixed-point number
 * @param x the big number we will be parsing
 * @param decimals the number of decimal places for this big number
 * @returns string
 */
export function fromBn(x: BigNumber, decimals: number = 18): string {
  if (x === undefined) {
    throw new Error("Input must not be undefined");
  }

  if (decimals < 1 || decimals > 77) {
    throw new Error("Decimals must be between 1 and 77");
  }

  const result: string = FixedNumber.fromValue(
    x,
    decimals,
    `fixed256x${decimals}`
  ).toString();
  return result.replace(/.0$/, "");
}
