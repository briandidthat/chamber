import { Quote } from "../lib/types";
import { Token } from "../lib/types";

export enum LiquiditySource {
  PARASWAP = "Paraswap",
  ZERO_X = "0x",
  ONE_INCH = "1inch",
}

// standardize shape of quote for ordering
export function buildQuote(
  sellToken: Token,
  buyToken: Token,
  liquiditySource: LiquiditySource,
  expectedOutput: string,
  response: any
): Quote {
  return {
    sellToken,
    buyToken,
    liquiditySource,
    expectedOutput,
    response,
  };
}
