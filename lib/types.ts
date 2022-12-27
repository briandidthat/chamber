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

export type Quote = {
  buyToken: Token;
  sellToken: Token;
  liquiditySource: string;
  expectedOutput: any;
  response: any;
};

export type SwapDetails = {
  sellToken: string;
  buyToken: string;
  amount: string;
  network?: string;
};
