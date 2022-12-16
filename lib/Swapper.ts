import { constructSimpleSDK, SwapSide } from "@paraswap/sdk";
import axios from "axios";
import { ethers, BigNumber } from "ethers";
import keyManager from "../lib/KeyManager";
import {
  getTokenDetails,
  createQueryString,
  createQuote,
  fromBn,
} from "../utils";
import { LIQUIDITY_SOURCE, Quote } from "./types";

const provider = new ethers.providers.JsonRpcProvider(
  keyManager.get("ALCHEMY_RPC_URL")
);
const signer = new ethers.Wallet(keyManager.get("PRIVATE_KEY"), provider);

// options for paraswap sdk
const providerOptionsEther = {
  ethersProviderOrSigner: provider, // JsonRpcProvider
  EthersContract: ethers.Contract,
  account: signer.address,
};

// construct minimal SDK with fetcher only
const paraSwapMin = constructSimpleSDK(
  { chainId: 1, axios },
  providerOptionsEther
);

class Swapper {
  private static oneInchUrl: string = "https://api.1inch.io/v5.0/1";
  private static zeroXUrl: string = "https://api.0x.org/swap/v1";

  static async fetchOxQuote(
    sellToken: string,
    buyToken: string,
    amount: BigNumber
  ) {
    const zeroXQoute = await axios.get(
      createQueryString(this.zeroXUrl, "/quote", {
        sellToken: sellToken,
        buyToken: buyToken,
        sellAmount: amount.toString(),
      })
    );
    return zeroXQoute.data;
  }

  static async fetchOneInchQoute(
    fromTokenAddress: string,
    toTokenAddress: string,
    amount: BigNumber
  ) {
    const oneInchQoute = await axios.get(
      createQueryString(this.oneInchUrl, "/quote", {
        fromTokenAddress: fromTokenAddress,
        toTokenAddress: toTokenAddress,
        amount: amount.toString(),
      })
    );
    return oneInchQoute.data;
  }

  static async fetchParaswapQoute(
    srcToken: string,
    destToken: string,
    amount: BigNumber
  ) {
    const quote = await paraSwapMin.swap.getRate({
      srcToken: srcToken,
      destToken: destToken,
      amount: amount.toString(),
      side: SwapSide.SELL,
    });

    return quote;
  }

  static async fetchAllQuotesForSwap(
    sellToken: string,
    buyToken: string,
    amount: string
  ) {
    const sell = sellToken.toUpperCase();
    const buy = buyToken.toUpperCase();
    const sellTokenAddress = getTokenDetails(sell);
    const buyTokenAddress = getTokenDetails(buy);

    try {
      const sellAmount: BigNumber =
        sell === "USDC"
          ? ethers.utils.parseUnits(amount, "mwei")
          : ethers.utils.parseEther(amount);

      const [zeroXQoute, oneInchQoute, paraswapQoute] = await Promise.all([
        this.fetchOxQuote(sell, buy, sellAmount),
        this.fetchOneInchQoute(sellTokenAddress, buyTokenAddress, sellAmount),
        this.fetchParaswapQoute(sellTokenAddress, buyTokenAddress, sellAmount),
      ]);

      const quotes: Quote[] = [
        createQuote(LIQUIDITY_SOURCE.ZERO_X, zeroXQoute.buyAmount, zeroXQoute),
        createQuote(
          LIQUIDITY_SOURCE.ONE_INCH,
          oneInchQoute.toTokenAmount,
          oneInchQoute
        ),
        createQuote(
          LIQUIDITY_SOURCE.PARASWAP,
          paraswapQoute?.destAmount || "",
          paraswapQoute
        ),
      ];

      return quotes;
    } catch (err) {
      console.error(err);
    }

    return [];
  }

  static async findBestQuote(
    sellToken: string,
    buyToken: string,
    amount: string
  ) {
    console.log(
      `Finding best quote for ${sellToken} -> ${buyToken} swap. Sell amount: ${amount.toLocaleLowerCase()}`
    );
    const quotes = await this.fetchAllQuotesForSwap(
      sellToken,
      buyToken,
      amount
    );

    quotes.sort((a, b) => b.expectedOutput - a.expectedOutput);
    quotes.map((val, index) => {
      console.log(
        `${index}: ${val.liquiditySource}. Expected ouput: ${fromBn(
          val.expectedOutput,
          18
        )}`
      );
    });

    return quotes[0];
  }

  static async checkOneInchAllowance(tokenAddress: string, signer: string) {
    return axios
      .get(
        createQueryString(this.oneInchUrl, "/approve/allowance", {
          tokenAddress,
          signer,
        })
      )
      .then((res) => res.data.allowance);
  }

  static async buildOneInchTxData(quote: any, signer: string) {
    try {
      const response = await axios.get(
        createQueryString(this.oneInchUrl, "/swap?", {
          sellTokenAddress: quote.fromToken.address,
          buyTokenAddress: quote.toToken.address,
          amount: quote.fromTokenAmount,
          fromAddress: signer,
          slippage: "1",
        })
      );
      return response.data;
    } catch (err) {
      console.error(err);
    }
  }

  static async buildParaswapTxData(quote: any) {
    try {
      const txParams = await paraSwapMin.swap.buildTx({
        srcToken: quote.srcToken,
        destToken: quote.destToken,
        srcAmount: quote.srcAmount,
        destAmount: quote.destAmount,
        priceRoute: quote.priceRoute,
        userAddress: signer.address,
      });

      return {
        ...txParams,
        gasPrice: new BigNumber(txParams.gasPrice, "gwei").toString(),
        gasLimit: new BigNumber(5000000, "gwei").toString(),
        value: "0x" + new BigNumber(txParams.value, "ether").toString(),
      };
    } catch (err) {
      console.error(err);
    }
  }

  static async buildSwapParams(quote: Quote, signer: string) {
    switch (quote.liquiditySource) {
      case LIQUIDITY_SOURCE.ONE_INCH:
        return await this.buildOneInchTxData(quote, signer);
      case LIQUIDITY_SOURCE.PARASWAP:
        return await this.buildParaswapTxData(quote);
      case LIQUIDITY_SOURCE.ZERO_X:
        const { data, to, value, gas, gasPrice } = quote.response;
        return { data, to, value, gas, gasPrice };
      default:
        throw new Error("Unsupported liquidity source");
    }
  }

  static async executeSwap(
    sellToken: string,
    buyToken: string,
    amount: string,
    network?: string
  ) {
    try {
      const bestQuote = await this.findBestQuote(sellToken, buyToken, amount);
      console.log(
        `Swapping ${amount} ${sellToken} to ${buyToken} via ${bestQuote?.liquiditySource}`
      );
      const txParams = await this.buildSwapParams(bestQuote, signer.address);
    } catch (err) {
      console.error(err);
    }
  }
}

export default Swapper;
