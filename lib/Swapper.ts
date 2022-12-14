import axios from "axios";
import { ethers, BigNumber } from "ethers";
import keyManager from "../lib/KeyManager";
import {
  getTokenAddress,
  createQueryString,
  getNetworkUrl,
  LIQUIDITY_SOURCES,
  fromBn,
} from "../utils";
import {
  createQuote,
  ParaswapTxRequest,
  ParaswapTxResponse,
  Quote,
} from "./types";

class Swapper {
  static cowSwapUrl = "https://api.cow.fi/mainnet/api/v1";
  static oneInchUrl: string = "https://api.1inch.io/v5.0/1";
  static zeroXUrl: string = "https://api.0x.org/swap/v1";
  static paraswapUrl: string = "https://apiv5.paraswap.io";
  static paraswapBroadcastApiUrl: string =
    "https://tx-gateway.1inch.io/v1.1/1/broadcast";

  static async getOneInchTxData(quote: any, signer: string) {
    try {
      const response = await axios.get(
        createQueryString(this.oneInchUrl, "swap?", {
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

  static async getParaswapTxData(
    quote: any,
    networkId: string,
    signer: string
  ) {
    try {
      const response = await axios.post<ParaswapTxRequest, ParaswapTxResponse>(
        `${this.paraswapUrl}/transactions/${networkId}`,
        {
          srcToken: quote.priceRoute.srcToken,
          destToken: quote.priceRoute.destToken,
          destAmount: quote.priceRoute.destAmount,
          priceRoute: quote.priceRoute,
          userAddress: signer,
        }
      );
      return response.data;
    } catch (err) {
      console.error(err);
    }
  }

  static async executeSwap(
    sellToken: string,
    buyToken: string,
    amount: string,
    network: string
  ) {
    const networkUrl = getNetworkUrl(network);
    const provider = new ethers.providers.JsonRpcProvider(networkUrl);
    const signer = new ethers.Wallet(keyManager.get("PRIVATE_KEY"), provider);

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
    
    if (quotes.length === 0) {
      console.log("Error getting quotes, exiting process.");
      process.exitCode = 1;
    };

    quotes.sort((a, b) => b.expectedOutput - a.expectedOutput);
    quotes.map((val, index) => {
      console.log(
        `${index}: ${val.liquiditySource}. Expected ouput: ${fromBn(val.expectedOutput, 18)}`
      );
    });

    return quotes[0];
  }

  static async fetchOxQuote(
    sellToken: string,
    buyToken: string,
    amount: BigNumber
  ) {
    try {
      const zeroXQoute = await axios.get(
        createQueryString(this.zeroXUrl, "/quote", {
          sellToken: sellToken,
          buyToken: buyToken,
          sellAmount: amount.toString(),
        })
      );
      return zeroXQoute.data;
    } catch (err) {
      console.error(err);
    }
  }

  static async fetchCowswapQuote(
    sellToken: string,
    buyToken: string,
    amount: BigNumber
  ) {
    const signer = keyManager.get("SIGNER");
    try {
      const cowswapQoute = await axios.post(this.cowSwapUrl + "/quote", {
        sellToken: sellToken,
        buyToken: buyToken,
        from: signer,
        receiver: signer,
        partiallyFillable: false,
        kind: "sell",
        sellAmountBeforeFee: amount.toString(),
      });

      return cowswapQoute.data;
    } catch (err) {
      console.error(err);
    }
  }

  static async fetchOneInchQoute(
    fromTokenAddress: string,
    toTokenAddress: string,
    amount: BigNumber
  ) {
    try {
      const oneInchQoute = await axios.get(
        createQueryString(this.oneInchUrl, "/quote", {
          fromTokenAddress: fromTokenAddress,
          toTokenAddress: toTokenAddress,
          amount: amount.toString(),
        })
      );
      return oneInchQoute.data;
    } catch (err) {
      console.error(err);
    }
  }

  static async fetchParaswapQoute(
    srcToken: string,
    destToken: string,
    amount: BigNumber
  ) {
    try {
      const paraswapQoute = await axios.get(
        createQueryString(this.paraswapUrl, "/prices", {
          srcToken: srcToken,
          destToken: destToken,
          amount: amount.toString(),
          side: "SELL",
          network: "1",
        })
      );
      return paraswapQoute.data;
    } catch (err) {
      console.error(err);
    }
  }

  static async fetchAllQuotesForSwap(
    sellToken: string,
    buyToken: string,
    amount: string
  ) {
    const sell = sellToken.toUpperCase();
    const buy = buyToken.toUpperCase();
    const sellTokenAddress = getTokenAddress(sell);
    const buyTokenAddress = getTokenAddress(buy);

    try {
      const sellAmount: BigNumber =
        sell === "USDC"
          ? ethers.utils.parseUnits(amount, "mwei")
          : ethers.utils.parseEther(amount);

      const [zeroXQoute, cowswapQoute, oneInchQoute, paraswapQoute] =
        await Promise.all([
          this.fetchOxQuote(sell, buy, sellAmount),
          this.fetchCowswapQuote(sellTokenAddress, buyTokenAddress, sellAmount),
          this.fetchOneInchQoute(sellTokenAddress, buyTokenAddress, sellAmount),
          this.fetchParaswapQoute(
            sellTokenAddress,
            buyTokenAddress,
            sellAmount
          ),
        ]);

      const quotes: Quote[] = [
        createQuote(LIQUIDITY_SOURCES.ZERO_X, zeroXQoute.buyAmount, zeroXQoute),
        createQuote(LIQUIDITY_SOURCES.COWSWAP, cowswapQoute.quote.buyAmount, cowswapQoute),
        createQuote(
          LIQUIDITY_SOURCES.ONE_INCH,
          oneInchQoute.toTokenAmount,
          oneInchQoute
        ),
        createQuote(
          LIQUIDITY_SOURCES.PARASWAP,
          paraswapQoute.priceRoute.destAmount,
          paraswapQoute
        ),
      ];

      return quotes;
    } catch (err) {
      console.error(err);
    }

    return [];
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

  static async buildSwapParams(quote: any, signer: string) {
    switch (quote.liquiditySource) {
      case LIQUIDITY_SOURCES.ONE_INCH:
        return await this.getOneInchTxData(quote, signer);
      case LIQUIDITY_SOURCES.PARASWAP:
        return await this.getParaswapTxData(quote, "1", signer);
      case LIQUIDITY_SOURCES.ZERO_X:
        return quote;
      default:
        throw new Error("Unsupported liquidity source");
    }
  }

  static async broadCastRawTransaction(rawTransaction: string) {
    const txHash = await axios.post(
      this.paraswapBroadcastApiUrl,
      JSON.stringify({ rawTransaction })
    );
    return txHash.data.transactionHash;
  }

  static async signAndSendTransaction(
    transaction: ethers.providers.TransactionRequest
  ) {
    const privateKey = keyManager.get("PRIVATE-KEY");
    const signer = new ethers.Wallet(privateKey);

    const rawTransaction = await signer.signTransaction(transaction);

    return await this.broadCastRawTransaction(rawTransaction);
  }
}

export default Swapper;
