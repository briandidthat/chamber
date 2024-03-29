import { program } from "commander";
import { SwapDetails } from "../lib/types";
import swapCommands from "../commands/swap";

program
  .command("quote")
  .description("fetch quote for a token pair swap")
  .requiredOption("-s, --sellToken <name>", "token you will be selling")
  .requiredOption("-b, --buyToken <name>", "token you will be buying")
  .requiredOption(
    "-a, --amount <number>",
    "amount of sell token you'll be selling"
  )
  .action(({ sellToken, buyToken, amount }: SwapDetails) =>
    swapCommands.findBestQuote(sellToken, buyToken, amount)
  );

program
  .command("execute")
  .description("execute swap on chain via whitelisted liquidity sources")
  .requiredOption("-s, --sellToken <name>", "token you will be selling")
  .requiredOption("-b, --buyToken <name>", "token you will be buying")
  .requiredOption(
    "-a, --amount <number>",
    "amount of sell token you'll be selling"
  )
  .action(({ sellToken, buyToken, amount }: SwapDetails) =>
    swapCommands.swap(sellToken, buyToken, amount)
  );

program.parse(process.argv);
