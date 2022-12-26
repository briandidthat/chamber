import axios from "axios";
import inquirer from "inquirer";
import Moralis from "moralis";
import { ethers, BigNumber } from "ethers";
import { constructSimpleSDK, SimpleSDK, SwapSide } from "@paraswap/sdk";
import {
  fromBn,
  buildQuote,
  getTokenDetails,
  createQueryString,
  API_URLS,
  LIQUIDITY_SOURCE,
} from "../utils";
import { Quote } from "./types";
import keyManager from "./KeyManager";

class Swapper {
  private signer: ethers.Wallet;
  private paraswapMin: SimpleSDK;
  private moralis;
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
        ethersProviderOrSigner: this.provider,
        EthersContract: ethers.Contract,
        account: this.signer.address,
      }
    );
    this.moralis = Promise.resolve(
      Moralis.start({ apiKey: keyManager.get("MORALIS_API_KEY") })
    );
  }

  setSigner(signer: ethers.Wallet) {
    this.signer = signer;
  }

  setProvider(provider: ethers.providers.JsonRpcProvider) {
    this.provider = provider;
  }

  setNetwork(chainId: string) {
    this.provider = new ethers.providers.JsonRpcProvider(chainId);
    this.paraswapMin = constructSimpleSDK(
      { chainId: Number(chainId), axios },
      {
        ethersProviderOrSigner: this.provider, // JsonRpcProvider
        EthersContract: ethers.Contract,
        account: this.signer.address,
      }
    );
  }

  async fetchOxQuote(sellToken: string, buyToken: string, amount: BigNumber) {
    const response = (
      await axios.get(
        createQueryString(API_URLS.ZERO_X, "/quote", {
          sellToken: sellToken,
          buyToken: buyToken,
          sellAmount: amount.toString(),
        })
      )
    ).data;
    return buildQuote(
      sellToken,
      buyToken,
      LIQUIDITY_SOURCE.ZERO_X,
      response.buyAmount,
      response
    );
  }

  async fetchOneInchQoute(
    fromTokenAddress: string,
    toTokenAddress: string,
    amount: BigNumber
  ) {
    const response = (
      await axios.get(
        createQueryString(API_URLS.ONE_INCH, "/quote", {
          fromTokenAddress: fromTokenAddress,
          toTokenAddress: toTokenAddress,
          amount: amount.toString(),
        })
      )
    ).data;

    return buildQuote(
      fromTokenAddress,
      toTokenAddress,
      LIQUIDITY_SOURCE.ONE_INCH,
      response.toTokenAmount,
      response
    );
  }

  async fetchParaswapQoute(
    srcToken: string,
    destToken: string,
    amount: BigNumber
  ) {
    const response = await this.paraswapMin.swap.getRate({
      srcToken: srcToken,
      destToken: destToken,
      amount: amount.toString(),
      side: SwapSide.SELL,
    });

    return buildQuote(
      srcToken,
      destToken,
      LIQUIDITY_SOURCE.PARASWAP,
      response.destAmount,
      response
    );
  }

  async fetchAllQuotesForSwap(
    sellToken: string,
    buyToken: string,
    amount: string
  ) {
    const { address: sellTokenAddress } = getTokenDetails(sellToken);
    const { address: buyTokenAddress } = getTokenDetails(buyToken);

    const sellAmount: BigNumber =
      sellToken === "USDC"
        ? ethers.utils.parseUnits(amount, "mwei")
        : ethers.utils.parseEther(amount);

    try {
      const quotes = await Promise.all([
        this.fetchOxQuote(
          sellToken.toUpperCase(),
          buyToken.toUpperCase(),
          sellAmount
        ),
        this.fetchOneInchQoute(sellTokenAddress, buyTokenAddress, sellAmount),
        this.fetchParaswapQoute(sellTokenAddress, buyTokenAddress, sellAmount),
      ]);

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
          buyToken === "USDC" ? 6 : 18
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

  async buildOneInchTxData(
    quote: any
  ): Promise<ethers.providers.TransactionRequest> {
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
  }

  async buildParaswapTxData(
    quote: any
  ): Promise<ethers.providers.TransactionRequest> {
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
      value: new BigNumber(txParams.value, "ether").toString(),
    };
  }

  async buildSwapParams(
    quote: Quote
  ): Promise<ethers.providers.TransactionRequest> {
    switch (quote.liquiditySource) {
      case LIQUIDITY_SOURCE.ONE_INCH:
        return await this.buildOneInchTxData(quote);
      case LIQUIDITY_SOURCE.PARASWAP:
        return await this.buildParaswapTxData(quote);
      case LIQUIDITY_SOURCE.ZERO_X:
        const { data, to, value, gasLimit, gasPrice } = quote.response;
        return { data, to, value, gasLimit, gasPrice };
      default:
        throw new Error("Unsupported liquidity source");
    }
  }

  async executeSwap(sellToken: string, buyToken: string, amount: string) {
    try {
      const bestQuote = await this.fetchBestQuote(sellToken, buyToken, amount);
      const { shouldExecute } = await inquirer.prompt([
        {
          name: "shouldExecute",
          type: "confirm",
          message: `Swap ${amount} ${sellToken} for ~${fromBn(
            bestQuote.expectedOutput
          )} ${buyToken} via ${bestQuote?.liquiditySource}?`,
        },
      ]);

      if (!shouldExecute) return;

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
