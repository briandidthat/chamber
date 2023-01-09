import { BigNumber, FixedNumber } from "@ethersproject/bignumber";
import { Network } from "../lib/types";

export enum ProtocolUrls {
  ZERO_X = "https://api.0x.org/swap/v1",
  ONE_INCH = "https://api.1inch.io/v5.0/1",
  PARASWAP = "https://apiv5.paraswap.io",
  OPEN_OCEAN = "https://open-api.openocean.finance/v3",
  COINBASE = "https://api.coinbase.com/v2"
}

export enum ChainId {
  LOCALHOST = 0,
  MAINNET = 1,
  GOERLI = 5,
  BSC = 56,
  POLYGON = 137,
  FANTOM = 250,
  ARBITRUM = 42161,
  AVALANCHE = 43114,
}

const NetworkDetails: Record<ChainId, Network> = {
  [ChainId.LOCALHOST]: {
    chainId: 0,
    name: "localhost",
    nodeUrl: "http://127.0.0.1:8545",
    scanner: "",
  },
  [ChainId.MAINNET]: {
    chainId: 1,
    name: "eth",
    nodeUrl: "https://eth.llamarpc.com",
    scanner: "https://etherscan.io",
  },
  [ChainId.GOERLI]: {
    chainId: 5,
    name: "goerli",
    nodeUrl: "",
    scanner: "https://goerli.etherscan.io",
  },
  [ChainId.BSC]: {
    chainId: 56,
    name: "bsc",
    nodeUrl: "https://rpc.ankr.com/bsc",
    scanner: "https://bscscan.com",
  },
  [ChainId.POLYGON]: {
    name: "polygon",
    chainId: 137,
    nodeUrl: "https://polygon.llamarpc.com",
    scanner: "https://polygonscan.com",
  },
  [ChainId.FANTOM]: {
    name: "fantom",
    chainId: 250,
    nodeUrl: "https://rpc.ankr.com/fantom",
    scanner: "https://ftmscan.com",
  },
  [ChainId.ARBITRUM]: {
    name: "arbitrum",
    chainId: 42161,
    nodeUrl: "https://rpc.ankr.com/arbitrum",
    scanner: "https://arbiscan.io",
  },
  [ChainId.AVALANCHE]: {
    name: "avax",
    chainId: 43114,
    nodeUrl: "https://rpc.ankr.com/avalanche",
    scanner: "https://snowtrace.io",
  },
};

export const getNetwork = (chainId: ChainId) => {
  const network = NetworkDetails[chainId];
  if (!network) throw new Error("provided network is not supported");
  return network;
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

export function toCurrencyString(string: string) {
  return Number(string).toLocaleString(
    Intl.NumberFormat().resolvedOptions().locale,
    { style: "currency", currency: "USD" }
  );
}
