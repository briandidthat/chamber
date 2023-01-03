// CONFIG TYPES

import { BigNumber } from "ethers";
import { ChainId, LiquiditySource } from "../utils";

export type KeyPair = {
  key: string;
  val: string;
};

// PRICE TYPES

export type BinanceResponse = {
  symbol: string;
  price: string;
};

export type TickerList = {
  tickers: string[];
};

// WEB3 TYPES

export interface Network {
  name: string;
  nodeUrl: string;
  scanner: string;
  chainId: ChainId;
}

export type Token = {
  symbol: string;
  address: string;
  decimals: number;
};

// SWAP TYPES

export type Quote = {
  buyToken: Token;
  sellToken: Token;
  amount: BigNumber;
  liquiditySource: LiquiditySource;
  expectedOutput: any;
  response: any;
};

export type SwapDetails = {
  sellToken: string;
  buyToken: string;
  amount: string;
  network?: string;
};
