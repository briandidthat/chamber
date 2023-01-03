import { BigNumber, ethers } from "ethers";
import { tokens } from "./tokens.json";
import { Quote, Token } from "../lib/types";
import { LiquiditySource, Routers } from "./swap";
import { ChainId, ProtocolUrls, createQueryString } from "./web3";
import axios from "axios";

export const erc20Abi = [
  "function balanceOf(address account) external view returns (uint256)",
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
];

export const SUPPORTED_TOKENS: Record<ChainId, Token[]> = {
  [ChainId.LOCALHOST]: tokens,
  [ChainId.MAINNET]: tokens,
  [ChainId.GOERLI]: [],
  [ChainId.BSC]: [],
  [ChainId.FANTOM]: [],
  [ChainId.AVALANCHE]: [],
  [ChainId.ARBITRUM]: [],
  [ChainId.POLYGON]: [],
};

export const getTokenDetails = (symbol: string, chainId: ChainId): Token => {
  const tokens = SUPPORTED_TOKENS[chainId];
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
  chainId: ChainId
): Token[] => {
  const tokens = SUPPORTED_TOKENS[chainId];
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

export async function getTokenBalance(
  address: string,
  signer: ethers.Wallet
): Promise<BigNumber> {
  const token: ethers.Contract = new ethers.Contract(address, erc20Abi, signer);

  const balance: BigNumber = await token.balanceOf(address);
  return balance;
}

export async function increaseAllowance(
  address: string,
  spender: string,
  amount: string,
  signer: ethers.Wallet
): Promise<boolean> {
  const token: ethers.Contract = new ethers.Contract(address, erc20Abi, signer);
  const increased: boolean = await token
    .connect(signer)
    .approve(spender, amount);
  return increased;
}

export async function getTokenAllowance(
  address: string,
  spender: string,
  signer: ethers.Wallet
): Promise<BigNumber> {
  const token: ethers.Contract = new ethers.Contract(address, erc20Abi, signer);

  const allowance: BigNumber = await token.allowance(signer.address, spender);
  return allowance;
}

async function checkOneInchAllowance(token: Token, signer: ethers.Wallet) {
  return axios
    .get(
      createQueryString(ProtocolUrls.ONE_INCH, "/approve/allowance", {
        tokenAddress: token.address,
        signer: signer.address,
      })
    )
    .then((res) => ethers.utils.parseUnits(res.data.allowance, token.decimals));
}

export async function getTokenAllowanceByProtocol(
  quote: Quote,
  signer: ethers.Wallet
): Promise<BigNumber> {
  switch (quote.liquiditySource) {
    case LiquiditySource.ONE_INCH:
      return await checkOneInchAllowance(quote.sellToken, signer.address);
    case LiquiditySource.ZERO_X:
      return await getTokenAllowance(
        quote.sellToken.address,
        Routers[LiquiditySource.ZERO_X],
        signer
      );
    case LiquiditySource.PARASWAP:
      return await getTokenAllowance(
        quote.sellToken.address,
        Routers[LiquiditySource.PARASWAP],
        signer
      );
    default:
      throw new Error("Unsupported liquidity source");
  }
}
