import axios from "axios";
import colors from "colors";
import inquirer from "inquirer";
import { ethers, BigNumber } from "ethers";
import KeyManager from "./KeyManager";
import {
  ChainId,
  Routers,
  ProtocolUrls,
  LiquiditySource,
  fromBn,
  createQueryString,
  getNetwork,
  increaseAllowance,
  getTokenBalance,
  getTokenAllowance,
  getTokenPairDetails,
  buildQuote,
  buildOneInchTxData,
  buildParaswapTxData,
} from "../utils";
import { Quote, Token, Network } from "./types";

class Swapper {
  private network: Network;
  private signer: ethers.Wallet;
  private provider: ethers.providers.JsonRpcProvider;

  constructor(chainId: ChainId) {
    this.network = getNetwork(chainId);
    this.provider = new ethers.providers.JsonRpcProvider(this.network.nodeUrl);
    this.signer = new ethers.Wallet(
      KeyManager.get("PRIVATE_KEY"),
      this.provider
    );
  }

  setSigner(signer: ethers.Wallet) {
    this.signer = signer;
  }

  setNetwork(chainId: ChainId) {
    this.network = getNetwork(chainId);
  }

  setNewProvider(chainId: ChainId) {
    this.network = getNetwork(chainId);
    this.provider = new ethers.providers.JsonRpcProvider(this.network.nodeUrl);
  }

  getNetwork() {
    return this.network;
  }

  getSignerAddress() {
    return this.signer.address;
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
      amount,
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
      amount,
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
    const response = (
      await axios.get(
        createQueryString(ProtocolUrls.PARASWAP, "/prices", {
          srcToken: sellToken.address,
          destToken: buyToken.address,
          amount: amount.toString(),
          side: "SELL",
          network: this.network.chainId,
        })
      )
    ).data;

    return buildQuote(
      sellToken,
      buyToken,
      amount,
      LiquiditySource.PARASWAP,
      response.priceRoute.destAmount,
      response
    );
  }

  private async fetchOpenOceanQuote(
    sellToken: Token,
    buyToken: Token,
    amount: number
  ) {
    const response = (
      await axios.get(
        createQueryString(
          ProtocolUrls.OPEN_OCEAN,
          `/${this.network.name}/quote`,
          {
            inTokenAddress: sellToken.address,
            outTokenAddress: buyToken.address,
            amount: amount,
            gasPrice: 5,
            slippage: 1,
          }
        )
      )
    ).data;
    console.log(response);

    return buildQuote(
      sellToken,
      buyToken,
      BigNumber.from(amount),
      LiquiditySource.OPEN_OCEAN,
      response.data.outAmount,
      response
    );
  }

  private async fetchAllQuotesForSwap(
    sellToken: Token,
    buyToken: Token,
    amount: string
  ) {
    try {
      const sellAmount: BigNumber = ethers.utils.parseUnits(
        amount,
        sellToken.decimals
      );
      const quotes = await Promise.all([
        this.fetchOxQuote(sellToken, buyToken, sellAmount),
        this.fetchOneInchQoute(sellToken, buyToken, sellAmount),
        this.fetchParaswapQoute(sellToken, buyToken, sellAmount),
        this.fetchOpenOceanQuote(sellToken, buyToken, Number(amount)),
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
          buyToken.decimals
        )}`
      );
    });

    return quotes[0];
  }

  private async buildSwapParams(
    quote: Quote
  ): Promise<ethers.providers.TransactionRequest> {
    switch (quote.liquiditySource) {
      case LiquiditySource.ONE_INCH:
        return await buildOneInchTxData(quote, this.signer);
      case LiquiditySource.PARASWAP:
        return await buildParaswapTxData(quote, this.signer);
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

      const balance = await getTokenBalance(
        bestQuote.sellToken.address,
        this.signer
      );

      console.log(`Current ${sellToken} balance: ${balance.toString()}`.blue);

      if (balance < bestQuote.amount)
        throw new Error("Insufficient balance for swap");

      if (bestQuote.sellToken.symbol !== "ETH") {
        const allowance = await getTokenAllowance(bestQuote, this.signer);

        if (allowance < bestQuote.amount) {
          const { increaseAllowanceAmount } = await inquirer.prompt([
            {
              name: "increaseAllowanceAmount",
              type: "list",
              message: `Current approval is ${allowance.toString()}. Choose amount to increase it by.`,
              choices: [0, 1000, 10000, 100000, "max"],
            },
          ]);

          if (increaseAllowanceAmount === 0) return;

          const approve = await increaseAllowance(
            bestQuote.sellToken.address,
            Routers[bestQuote.liquiditySource],
            BigNumber.from(increaseAllowanceAmount),
            this.signer
          );
        }
      }

      console.log(
        `Building swap params for ${bestQuote.liquiditySource}...`.blue
      );
      const txRequest: ethers.providers.TransactionRequest =
        await this.buildSwapParams(bestQuote);
      console.log("Attempting swap transaction...".blue);
      const txResponse: ethers.providers.TransactionResponse =
        await this.signer.sendTransaction(txRequest);
      console.log(`Completed swap transaction. Hash: ${txResponse.hash}`.blue);
      return txResponse;
    } catch (err) {
      console.error(err);
    }
  }
}

export default Swapper;
