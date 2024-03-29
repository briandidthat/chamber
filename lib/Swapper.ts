import axios from "axios";
import colors from "colors";
import inquirer from "inquirer";
import { ethers, BigNumber } from "ethers";
import KeyManager from "./KeyManager";
import {
  fromBn,
  ChainId,
  Routers,
  getNetwork,
  buildQuote,
  getSpotPrice,
  ProtocolUrls,
  LiquiditySource,
  getTokenBalance,
  toCurrencyString,
  createQueryString,
  increaseAllowance,
  getTokenAllowance,
  buildOneInchTxData,
  getTokenPairDetails,
  buildParaswapTxData,
  buildOpenOceanTxData,
} from "../utils";
import { Quote, Token, Network } from "./types";

class Swapper {
  private network: Network;
  private signer: ethers.Wallet;
  private provider: ethers.providers.JsonRpcProvider;

  constructor(chainId: ChainId) {
    this.network = getNetwork(chainId);
    this.provider = new ethers.providers.JsonRpcProvider(this.network.nodeUrl);
    if (KeyManager.get("SIGNER") === "SIGNER") {
      this.signer = ethers.Wallet.createRandom();
      KeyManager.set("PRIVATE_KEY", this.signer.privateKey);
      KeyManager.set("SIGNER", this.signer.address);

      console.log("Initialized new wallet for transactions. Please copy this information");
      console.log(`Wallet address: ${this.signer.address}`.cyan.bold);
      console.log(`Private Key: ${this.signer.privateKey}`.cyan.bold);
      console.log(`Mnemonic: ${this.signer.mnemonic.phrase}`.cyan.bold);
    } else {
      this.signer = new ethers.Wallet(
        KeyManager.get("PRIVATE_KEY"),
        this.provider
      );
    }
  }

  setNetwork(chainId: ChainId) {
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
    const [sellToken, buyToken] = getTokenPairDetails(
      sellTokenSymbol,
      buyTokenSymbol,
      this.network.chainId
    );

    const [sellTokenUSD, buyTokenUSD] = await Promise.all([
      getSpotPrice(sellToken.symbol),
      getSpotPrice(buyToken.symbol),
    ]);

    console.log(`======== Fetching spot price for ${sellToken.symbol} and ${buyToken.symbol} ========`)

    console.log(
      `${sellToken.symbol} spot price: ${toCurrencyString(sellTokenUSD)}`.red
    );
    console.log(
      `${buyToken.symbol} spot price: ${toCurrencyString(buyTokenUSD)}`.green
    );

    console.log(
      `======== Finding best quote for ${sellTokenSymbol} -> ${buyTokenSymbol} swap. Sell amount: ${amount} ========`
    );

    const quotes = await this.fetchAllQuotesForSwap(
      sellToken,
      buyToken,
      amount
    );

    // sort the quotes in ascending order by the expected output amount
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
        return await buildOneInchTxData(quote, this.signer.address);
      case LiquiditySource.PARASWAP:
        return await buildParaswapTxData(
          quote,
          this.signer.address,
          this.network
        );
      case LiquiditySource.OPEN_OCEAN:
        return await buildOpenOceanTxData(
          quote,
          this.signer.address,
          this.network
        );
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
              message: `Current allowance is ${allowance.toString()}. Choose amount to increase it by.`,
              choices: [0, 1000, 10000, 100000, "max"],
            },
          ]);

          if (increaseAllowanceAmount === 0) return;

          const approve = await increaseAllowance(
            bestQuote.sellToken.address,
            Routers[bestQuote.liquiditySource],
            BigNumber.from(increaseAllowanceAmount === "max" ? ethers.constants.MaxUint256 : increaseAllowanceAmount),
            this.signer
          );

          if (!approve) {
            throw new Error("Failed to increase allowance.");
          }
        }
      }

      console.log(
        `Building swap params for ${bestQuote.liquiditySource}...`.blue
      );
      const txRequest: ethers.providers.TransactionRequest =
        await this.buildSwapParams(bestQuote);

      console.log("Sending swap transaction...".blue);
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
