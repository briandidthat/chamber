const { program } = require("commander");
const fetch = require("../commands/fetch");

program
  .command("price")
  .description("fetch the price for one or more crypto assets")
  .requiredOption("-t, --tickers <tickers...>", "tickers to fetch")
  .action(({ tickers }) => tickers.forEach((ticker) => fetch.getPrice(ticker)));

program.parse(process.argv);
