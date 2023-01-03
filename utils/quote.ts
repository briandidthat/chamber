import { BigNumber } from "ethers";
import { Quote, Token } from "../lib/types";

export enum LiquiditySource {
  PARASWAP = "Paraswap",
  ZERO_X = "0x",
  ONE_INCH = "1inch",
}

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
