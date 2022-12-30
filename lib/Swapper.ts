import axios from "axios";
import inquirer from "inquirer";
import { ethers, BigNumber, providers, Wallet } from "ethers";
import { constructSimpleSDK, SimpleSDK, SwapSide } from "@paraswap/sdk";
import keyManager from "./KeyManager";
import { Quote, Token, Network } from "./types";
import {
  fromBn,
  buildQuote,
  createQueryString,
  ProtocolUrls,
  LiquiditySource,
  ChainId,
  getTokenPairDetails,
  getNetwork,
} from "../utils";

class Swapper {
  private signer: ethers.Wallet;
  private paraswapMin: SimpleSDK;
  private provider: ethers.providers.JsonRpcProvider;
  private currentNetwork: Network;

  constructor(chainId: ChainId) {
    this.currentNetwork = getNetwork(chainId);
    this.provider = new providers.JsonRpcProvider(this.currentNetwork.nodeUrl);
    this.signer = new Wallet(keyManager.get("PRIVATE_KEY"), this.provider);
    this.paraswapMin = this.getNewParaswapSdk(chainId);
  }

  setSigner(signer: ethers.Wallet, chainId: ChainId = ChainId.MAINNET) {
    this.signer = signer;
    this.paraswapMin = this.getNewParaswapSdk(chainId);
  }

  setNewProvider(chainId: ChainId) {
    this.currentNetwork = getNetwork(chainId);
    this.provider = new providers.JsonRpcProvider(this.currentNetwork.nodeUrl);
    this.paraswapMin = this.getNewParaswapSdk(chainId);
  }

  setCurrentNetwork(chainId: ChainId) {
    this.currentNetwork = getNetwork(chainId);
  }

  getCurrentNetwork() {
    return this.currentNetwork;
  }

  getNewParaswapSdk(chainId: ChainId) {
    return constructSimpleSDK(
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
        createQueryString(ProtocolUrls.ZERO_X, "/quote", {
          sellToken: sellToken.symbol,
          buyToken: buyToken.symbol,
          sellAmount: amount.toString(),
        })
      )
    ).data;
    return buildQuote(
      sellToken,
      buyToken,
      LiquiditySource.ZERO_X,
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
        createQueryString(ProtocolUrls.ONE_INCH, "/quote", {
          fromTokenAddress: sellToken.address,
          toTokenAddress: buyToken.address,
          amount: amount.toString(),
        })
      )
    ).data;

    return buildQuote(
      sellToken,
      buyToken,
      LiquiditySource.ONE_INCH,
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
      LiquiditySource.PARASWAP,
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
      ChainId.MAINNET
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
        createQueryString(ProtocolUrls.ONE_INCH, "/approve/allowance", {
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
      createQueryString(ProtocolUrls.ONE_INCH, "/swap?", {
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
      case LiquiditySource.ONE_INCH:
        return await this.buildOneInchTxData(quote);
      case LiquiditySource.PARASWAP:
        return await this.buildParaswapTxData(quote);
      case LiquiditySource.ZERO_X:
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
