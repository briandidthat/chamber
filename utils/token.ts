import axios from "axios";
import { BigNumber, ethers } from "ethers";
import { tokens } from "./tokens.json";
import { Quote, Token } from "../lib/types";
import { LiquiditySource, Routers } from "./swap";
import { ChainId, ProtocolUrls, createQueryString } from "./web3";

export const erc20Abi = [
  "function balanceOf(address account) external view returns (uint256)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) external returns (bool)",
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

  tokens.map((token) => {
    if (token.symbol === sellToken) sellTokenDetails = token;
    if (token.symbol === buyToken) buyTokenDetails = token;
  });

  if (sellTokenDetails === undefined || buyTokenDetails === undefined) {
    throw new Error(`${sellToken} -> ${buyToken} is not a supported trade`);
  }
  return [sellTokenDetails, buyTokenDetails];
};

async function getOneInchAllowance(token: Token, signer: ethers.Wallet) {
  const response = (
    await axios.get(
      createQueryString(ProtocolUrls.ONE_INCH, "/approve/allowance", {
        tokenAddress: token.address,
        signer: signer.address,
      })
    )
  ).data;

  return ethers.utils.parseUnits(response.allowance, token.decimals);
}

export async function getTokenAllowance(
  quote: Quote,
  signer: ethers.Wallet
): Promise<BigNumber> {
  if (quote.liquiditySource === LiquiditySource.ONE_INCH) {
    return await getOneInchAllowance(quote.sellToken, signer);
  }

  const token: ethers.Contract = new ethers.Contract(
    quote.sellToken.address,
    erc20Abi,
    signer
  );
  const allowance: BigNumber = await token.allowance(
    signer.address,
    Routers[quote.liquiditySource]
  );
  return allowance;
}

export async function increaseAllowance(
  address: string,
  spender: string,
  amount: BigNumber,
  signer: ethers.Wallet
): Promise<boolean> {
  const token: ethers.Contract = new ethers.Contract(address, erc20Abi, signer);
  const increased: boolean = await token
    .connect(signer)
    .approve(spender, amount);
  return increased;
}

export async function getTokenBalance(
  address: string,
  signer: ethers.Wallet
): Promise<BigNumber> {
  const token: ethers.Contract = new ethers.Contract(address, erc20Abi, signer);
  const balance: BigNumber = await token.balanceOf(address);
  return balance;
}

// TOKEN PRICE FUNCTIONS

export async function getSpotPrice(ticker: string): Promise<string> {
  const response = (
    await axios.get(`${ProtocolUrls.COINBASE}/prices/${ticker}-USD/spot`)
  ).data;
  return response.data.amount;
}