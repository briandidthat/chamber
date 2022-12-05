// CONFIG TYPES

export type KeyPair = {
  key: string;
  value: string;
};

// PRICE TYPES

export type BinanceResponse = {
  symbol: string;
  price: string;
};

export type TickerList = {
  tickers: string[];
};

// SWAP TYPES

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
