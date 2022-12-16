// CONFIG TYPES

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
export type Token = {
  symbol: string;
  address: string;
  decimals: number;
};

// SWAP TYPES

export enum LIQUIDITY_SOURCE {
  COWSWAP = "Cowswap",
  PARASWAP = "Paraswap",
  ZERO_X = "0x",
  ONE_INCH = "1inch",
}

export type Quote = {
  liquiditySource: string;
  expectedOutput: any;
  response: any;
};

export type SwapInfo = {
  sellToken: string;
  buyToken: string;
  amount: string;
  network?: string;
};