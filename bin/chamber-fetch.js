const {program} = require("commander");
const {fetch} = require("../commands/fetch")

program
    .command("price")
    .description("fetch crypto related things")
    .argument("<ticker>", "crypto ticker to fetch the price for")
    .action((ticker) => fetch.getPrice(ticker));

program
    .command("quote")
    .description("fetch quote for a token pair")
    .requiredOption("-s, --sellToken <address>", "token you will be selling")
    .requiredOption("-b, --buyToken <address>", "token you will be buying")
    .requiredOption("-a, --amount <number>", "amount of sell token you'll be selling")
    .action((args) => fetch.getQuote(args));

program.parse(process.argv);
