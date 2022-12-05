import keyManager from "../lib/KeyManager";

export const TOKEN_MAP: Record<string, string> = {
  ETH: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
  DAI: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
  USDC: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
  USDT: "0xdac17f958d2ee523a2206206994597c13d831ec7",
  WETH: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
  WBTC: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
};

export const LIQUIDITY_SOURCES: Record<string, string> = {
  PARASWAP: "paraswap",
  ZERO_X: "0x",
  ONE_INCH: "1inch",
};

export const NETWORK_MAP: Record<string, string> = {
  //    mainnet: keyManager.get("MAINNET_URL"),
  localhost: "http://127.0.0.1:8545",
};

export const getTokenAddress = (ticker: string) => {
  const address = TOKEN_MAP[ticker.toUpperCase()];
  if (!ticker) throw new Error("that token is not supported");
  return address;
};

export const getNetworkUrl = (network: string) => {
  const networkUrl = NETWORK_MAP[network.toLowerCase()];
  if (!networkUrl) throw new Error("provided network is not supported");
  return networkUrl;
};

export const createQueryString = (
  url: string,
  path: string,
  params: Record<string, string>
) => {
  return url + path + "?" + new URLSearchParams(params).toString();
};
