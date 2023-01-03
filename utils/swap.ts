import axios from "axios";
import { BigNumber, ethers } from "ethers";
import { Quote, Token } from "../lib/types";
import { ChainId, ProtocolUrls, createQueryString } from "./web3";

export enum LiquiditySource {
  PARASWAP = "Paraswap",
  ZERO_X = "0x",
  ONE_INCH = "1inch",
}

// SWAP routers for erc20 swaps
export const Routers: Record<LiquiditySource, string> = {
  [LiquiditySource.ZERO_X]: "0xDef1C0ded9bec7F1a1670819833240f027b25EfF",
  [LiquiditySource.PARASWAP]: "0x216B4B4Ba9F3e719726886d34a177484278Bfcae",
  [LiquiditySource.ONE_INCH]: "",
};

// standardize shape of quote for ordering
export function buildQuote(
  sellToken: Token,
  buyToken: Token,
  amount: BigNumber,
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
  signer: ethers.Wallet
): Promise<ethers.providers.TransactionRequest> {
  const response = await axios.get(
    createQueryString(ProtocolUrls.ONE_INCH, "/swap?", {
      sellTokenAddress: quote.sellToken.address,
      buyTokenAddress: quote.buyToken.address,
      amount: quote.amount,
      fromAddress: signer.address,
      slippage: "1",
    })
  );
  return response.data;
}

export async function buildParaswapTxData(
  quote: Quote,
  signer: ethers.Wallet
): Promise<ethers.providers.TransactionRequest> {
  const txParams = (
    await axios.post(
      `${ProtocolUrls.PARASWAP}/transactions/${ChainId.MAINNET}`,
      {
        srcToken: quote.sellToken.address,
        destToken: quote.buyToken.address,
        destAmount: quote.response.priceRoute.destAmount,
        priceRoute: quote.response.priceRoute,
        userAddress: signer.address,
      }
    )
  ).data;

  return {
    ...txParams,
    gasPrice: new BigNumber(txParams.gasPrice, "gwei").toString(),
    gasLimit: new BigNumber(5000000, "gwei").toString(),
    value: new BigNumber(txParams.value, "ether").toString(),
  };
}
