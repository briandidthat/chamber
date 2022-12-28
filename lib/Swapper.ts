import axios from "axios";
import inquirer from "inquirer";
import { ethers, BigNumber } from "ethers";
import { constructSimpleSDK, SimpleSDK, SwapSide } from "@paraswap/sdk";
import {
  fromBn,
  buildQuote,
  createQueryString,
  API_URLS,
  LIQUIDITY_SOURCE,
} from "../utils";
import { Quote, Token } from "./types";
import { CHAIN_ID, getTokenPairDetails } from "../utils";
import keyManager from "./KeyManager";

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
        ethersProviderOrSigner: this.provider,
        EthersContract: ethers.Contract,
        account: this.signer.address,
      }
    );
  }

  setSigner(signer: ethers.Wallet) {
    this.signer = signer;
  }

  setProvider(provider: ethers.providers.JsonRpcProvider) {
    this.provider = provider;
  }

  setNetwork(chainId: number) {
    this.provider = new ethers.providers.JsonRpcProvider(
      keyManager.get("CURRENT_NETWORK")
    );
    this.paraswapMin = constructSimpleSDK(
      { chainId: chainId, axios },
      {
        ethersProviderOrSigner: this.provider, // JsonRpcProvider
        EthersContract: ethers.Contract,
        account: this.signer.address,
      }
    );
  }

  private async fetchOxQuote(
    sellToken: Token,
    buyToken: Token,
    amount: BigNumber
  ) {
    const response = (
      await axios.get(
        createQueryString(API_URLS.ZERO_X, "/quote", {
          sellToken: sellToken.symbol,
          buyToken: buyToken.symbol,
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

  private async fetchOneInchQoute(
    sellToken: Token,
    buyToken: Token,
    amount: BigNumber
  ) {
    const response = (
      await axios.get(
        createQueryString(API_URLS.ONE_INCH, "/quote", {
          fromTokenAddress: sellToken.address,
          toTokenAddress: buyToken.address,
          amount: amount.toString(),
        })
      )
    ).data;

    return buildQuote(
      sellToken,
      buyToken,
      LIQUIDITY_SOURCE.ONE_INCH,
      response.toTokenAmount,
      response
    );
  }

  private async fetchParaswapQoute(
    sellToken: Token,
    buyToken: Token,
    amount: BigNumber
  ) {
    const response = await this.paraswapMin.swap.getRate({
      srcToken: sellToken.address,
      destToken: buyToken.address,
      amount: amount.toString(),
      side: SwapSide.SELL,
    });

    return buildQuote(
      sellToken,
      buyToken,
      LIQUIDITY_SOURCE.PARASWAP,
      response.destAmount,
      response
    );
  }

  private async fetchAllQuotesForSwap(
    sellToken: Token,
    buyToken: Token,
    amount: BigNumber
  ) {
    try {
      const quotes = await Promise.all([
        this.fetchOxQuote(sellToken, buyToken, amount),
        this.fetchOneInchQoute(sellToken, buyToken, amount),
        this.fetchParaswapQoute(sellToken, buyToken, amount),
      ]);

      return quotes;
    } catch (err) {
      console.error(err);
    }

    return [];
  }

  async fetchBestQuote(
    sellTokenSymbol: string,
    buyTokenSymbol: string,
    amount: string
  ) {
    console.log(
      `Finding best quote for ${sellTokenSymbol} -> ${buyTokenSymbol} swap. Sell amount: ${amount.toLocaleLowerCase()}`
    );

    const [sellToken, buyToken] = getTokenPairDetails(
      sellTokenSymbol,
      buyTokenSymbol,
      CHAIN_ID.MAINNET
    );

    const sellAmount: BigNumber = ethers.utils.parseUnits(
      amount,
      sellToken.decimals
    );

    const quotes = await this.fetchAllQuotesForSwap(
      sellToken,
      buyToken,
      sellAmount
    );

    quotes.sort((a, b) => b.expectedOutput - a.expectedOutput);
    quotes.map((val, index) => {
      console.log(
        `${index}: ${val.liquiditySource}. Expected ouput: ${fromBn(
          val.expectedOutput,
          buyToken.decimals
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

  private async buildOneInchTxData(
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

  private async buildParaswapTxData(
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

  private async buildSwapParams(
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
