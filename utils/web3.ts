import { BigNumber, FixedNumber } from "@ethersproject/bignumber";

export enum API_URLS {
  ZERO_X = "https://api.0x.org/swap/v1",
  ONE_INCH = "https://api.1inch.io/v5.0/1",
}

export enum CHAIN_ID {
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
