import axios from "axios";
import { ethers } from "ethers";
import { Network, Quote, Token } from "../lib/types";
import { ProtocolUrls, createQueryString } from "./web3";

export enum LiquiditySource {
  PARASWAP = "Paraswap",
  ZERO_X = "0x",
  ONE_INCH = "1inch",
  OPEN_OCEAN = "OpenOcean",
}

// SWAP routers for erc20 swaps
export const Routers: Record<LiquiditySource, string> = {
  [LiquiditySource.ZERO_X]: "0xDef1C0ded9bec7F1a1670819833240f027b25EfF",
  [LiquiditySource.PARASWAP]: "0x216B4B4Ba9F3e719726886d34a177484278Bfcae",
  [LiquiditySource.ONE_INCH]: "",
  [LiquiditySource.OPEN_OCEAN]: "0x6352a56caadc4f1e25cd6c75970fa768a3304e64",
};

// standardize shape of quote for ordering
export function buildQuote(
  sellToken: Token,
  buyToken: Token,
  amount: ethers.BigNumber,
  liquiditySource: LiquiditySource,
  expectedOutput: string,
  response: any
): Quote {
  return {
    sellToken,
    buyToken,
    amount,
    liquiditySource,
    expectedOutput,
    response,
  };
}

export async function buildOneInchTxData(
  quote: Quote,
  signer: string
): Promise<ethers.providers.TransactionRequest> {
  const response = (
    await axios.get(
      createQueryString(ProtocolUrls.ONE_INCH, "/swap?", {
        sellTokenAddress: quote.sellToken.address,
        buyTokenAddress: quote.buyToken.address,
        amount: quote.amount,
        fromAddress: signer,
        slippage: 1,
      })
    )
  ).data;
  return response.tx;
}

export async function buildParaswapTxData(
  quote: Quote,
  signer: string,
  network: Network
): Promise<ethers.providers.TransactionRequest> {
  const txParams = (
    await axios.post(
      `${ProtocolUrls.PARASWAP}/transactions/${network.chainId}`,
      {
        srcToken: quote.sellToken.address,
        destToken: quote.buyToken.address,
        destAmount: quote.expectedOutput,
        priceRoute: quote.response.priceRoute,
        userAddress: signer,
      }
    )
  ).data;
  return txParams;
}

export async function buildOpenOceanTxData(
  quote: Quote,
  signer: string,
  network: Network
) {
  const txParams = (
    await axios.get(
      createQueryString(ProtocolUrls.OPEN_OCEAN, `${network.name}/swap_quote`, {
        inTokenAddress: quote.sellToken.address,
        outTokenAddress: quote.buyToken.address,
        amount: 5,
        gasPrice: 5,
        slippage: 100,
        account: signer,
      })
    )
  ).data;
  return txParams;
}
