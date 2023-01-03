import axios from "axios";
import inquirer from "inquirer";
import { ethers, BigNumber } from "ethers";
import keyManager from "./KeyManager";
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
  getTokenPairDetails,
  getTokenAllowanceByProtocol,
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
      keyManager.get("PRIVATE_KEY"),
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
          network: ChainId.MAINNET,
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

      if (balance < bestQuote.amount)
        throw new Error("Insufficient balance for swap");

      if (bestQuote.sellToken.symbol !== "ETH") {
        const allowance = await getTokenAllowanceByProtocol(
          bestQuote,
          this.signer
        );

        if (allowance < bestQuote.amount) {
          const { increaseAmount } = await inquirer.prompt([
            {
              name: "increaseApproval",
              type: "list",
              message: `Current approval is ${allowance.toString()}. Choose amount to increase it by.`,
              choices: ["0", "1000", "10000", "100000", "infinity"],
            },
          ]);
          if (increaseAmount === "0") return;

          const approve = await increaseAllowance(
            bestQuote.sellToken.address,
            Routers[bestQuote.liquiditySource],
            increaseAmount,
            this.signer
          );
        }
      }

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
