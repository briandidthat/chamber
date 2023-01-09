import { program } from "commander";
import Fetcher from "../commands/fetch";
import { TickerList } from "../lib/types";

program
  .command("price")
  .description("fetch the price for one or more crypto assets")
  .requiredOption("-t, --tickers <tickers...>", "tickers to fetch")
  .action(({ tickers }: TickerList) =>
    tickers.forEach((ticker: string) => Fetcher.getPrice(ticker))
  );

program.parse(process.argv);
