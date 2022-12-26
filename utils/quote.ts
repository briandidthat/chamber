import axios from "axios";
import { Quote } from "../lib/types";
import { LIQUIDITY_SOURCE } from "../utils";

// standardize shape of quote for ordering
export function buildQuote(
  sellToken: string,
  buyToken: string,
  liquiditySource: LIQUIDITY_SOURCE,
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

// get available tokens for swap on oneInch and paraswap currently
export const getAvailableTokens = async (liquiditySource: LIQUIDITY_SOURCE) => {
  let availableTokens;
  switch (liquiditySource) {
    case LIQUIDITY_SOURCE.ONE_INCH:
      availableTokens = (await axios.get("https://api.1inch.io/v5.0/1/tokens"))
        .data.tokens;
      break;
    case LIQUIDITY_SOURCE.PARASWAP:
      availableTokens = (await axios.get("https://apiv5.paraswap.io/tokens/1"))
        .data.tokens;
      break;
    default:
      throw new Error("Invalid liquidity source");
  }
  return availableTokens;
};
