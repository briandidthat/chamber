const {program} = require("commander");
const fetch = require("../commands/fetch")

program
    .command("price")
    .description("fetch the price for one or more crypto assets")
    .requiredOption("-t, --tickers <tickers...>", "tickers to fetch")
    .action(({tickers}) => tickers.forEach((ticker) => fetch.getPrice(ticker)));

program
    .command("quote")
    .description("fetch quote for a token pair swap")
    .requiredOption("-s, --sellToken <address>", "token you will be selling")
    .requiredOption("-b, --buyToken <address>", "token you will be buying")
    .requiredOption("-a, --amount <number>", "amount of sell token you'll be selling")
    .action(({sellToken, buyToken, amount}) => fetch.getQuote(sellToken, buyToken, amount));

program.parse(process.argv);
