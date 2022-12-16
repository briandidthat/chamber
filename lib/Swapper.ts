import { constructSimpleSDK, SimpleSDK, SwapSide } from "@paraswap/sdk";
import axios from "axios";
import { ethers, BigNumber } from "ethers";
import {
  getTokenDetails,
  createQueryString,
  createQuote,
  fromBn,
} from "../utils";
import { API_URLS, LIQUIDITY_SOURCE, Quote } from "./types";

class Swapper {
  private signer: ethers.Wallet;
  private paraswapMin: SimpleSDK;
  private provider: ethers.providers.JsonRpcProvider;

  constructor(
    provider: ethers.providers.JsonRpcProvider,
    signer: ethers.Wallet
  ) {
    this.provider = provider;
    this.signer = signer;
    // construct minimal SDK with fetcher only
    this.paraswapMin = constructSimpleSDK(
      { chainId: 1, axios },
      {
        ethersProviderOrSigner: this.provider, // JsonRpcProvider
        EthersContract: ethers.Contract,
        account: this.signer.address,
      }
    );
  }

  async fetchOxQuote(sellToken: string, buyToken: string, amount: BigNumber) {
    const zeroXQoute = await axios.get(
      createQueryString(API_URLS.ZERO_X, "/quote", {
        sellToken: sellToken,
        buyToken: buyToken,
        sellAmount: amount.toString(),
      })
    );
    return zeroXQoute.data;
  }

  async fetchOneInchQoute(
    fromTokenAddress: string,
    toTokenAddress: string,
    amount: BigNumber
  ) {
    const oneInchQoute = await axios.get(
      createQueryString(API_URLS.ONE_INCH, "/quote", {
        fromTokenAddress: fromTokenAddress,
        toTokenAddress: toTokenAddress,
        amount: amount.toString(),
      })
    );
    return oneInchQoute.data;
  }

  async fetchParaswapQoute(
    srcToken: string,
    destToken: string,
    amount: BigNumber
  ) {
    const quote = await this.paraswapMin.swap.getRate({
      srcToken: srcToken,
      destToken: destToken,
      amount: amount.toString(),
      side: SwapSide.SELL,
    });

    return quote;
  }

  async fetchAllQuotesForSwap(
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

  async fetchBestQuote(sellToken: string, buyToken: string, amount: string) {
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

  async checkOneInchAllowance(tokenAddress: string, signer: string) {
    return axios
      .get(
        createQueryString(API_URLS.ONE_INCH, "/approve/allowance", {
          tokenAddress,
          signer,
        })
      )
      .then((res) => res.data.allowance);
  }

  async buildOneInchTxData(quote: any) {
    try {
      const response = await axios.get(
        createQueryString(API_URLS.ONE_INCH, "/swap?", {
          sellTokenAddress: quote.fromToken.address,
          buyTokenAddress: quote.toToken.address,
          amount: quote.fromTokenAmount,
          fromAddress: this.signer.address,
          slippage: "1",
        })
      );
      return response.data;
    } catch (err) {
      console.error(err);
    }
  }

  async buildParaswapTxData(quote: any) {
    try {
      const txParams = await this.paraswapMin.swap.buildTx({
        srcToken: quote.srcToken,
        destToken: quote.destToken,
        srcAmount: quote.srcAmount,
        destAmount: quote.destAmount,
        priceRoute: quote.priceRoute,
        userAddress: this.signer.address,
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

  async buildSwapParams(quote: Quote) {
    switch (quote.liquiditySource) {
      case LIQUIDITY_SOURCE.ONE_INCH:
        return await this.buildOneInchTxData(quote);
      case LIQUIDITY_SOURCE.PARASWAP:
        return await this.buildParaswapTxData(quote);
      case LIQUIDITY_SOURCE.ZERO_X:
        const { data, to, value, gas, gasPrice } = quote.response;
        return { data, to, value, gas, gasPrice };
      default:
        throw new Error("Unsupported liquidity source");
    }
  }

  async executeSwap(sellToken: string, buyToken: string, amount: string) {
    try {
      const bestQuote = await this.fetchBestQuote(sellToken, buyToken, amount);
      console.log(
        `Swapping ${amount} ${sellToken} to ${buyToken} via ${bestQuote?.liquiditySource}`
      );

      const txRequest: ethers.providers.TransactionRequest =
        await this.buildSwapParams(bestQuote);
      const txResponse: ethers.providers.TransactionResponse =
        await this.signer.sendTransaction(txRequest);

      return txResponse;
    } catch (err) {
      console.error(err);
    }
  }
}

export default Swapper;
