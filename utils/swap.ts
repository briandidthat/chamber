import { BigNumber } from "ethers";
import { Quote, Token } from "../lib/types";

export enum LiquiditySource {
  PARASWAP = "Paraswap",
  ZERO_X = "0x",
  ONE_INCH = "1inch",
}

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
