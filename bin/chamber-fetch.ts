import { program } from "commander";
import fetcher from "../commands/fetch";
import { TickerList } from "../lib/types";

program
  .command("price")
  .description("fetch the price for one or more crypto assets")
  .requiredOption("-t, --tickers <tickers...>", "tickers to fetch")
  .action(({ tickers }: TickerList) =>
    tickers.forEach((ticker: string) => fetcher.getPrice(ticker))
  );

program.parse(process.argv);
