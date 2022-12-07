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

export type ParaswapTxRequest = {
  srcToken: string;
  destToken: string;
  destAmount: string;
  priceRoute: any;
  userAddress: string;
};

export type ParaswapTxResponse = {
  from: string;
  to: string;
  value: string;
  data: string;
  gasPrice: string;
  gas: string;
  chainId: number;
};
