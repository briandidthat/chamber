const {program} = require("commander");
const configCommands = require("../commands/config");

program
    .command("set")
    .description("store a new entry")
    .requiredOption("-k, --key", "the key for the new entry")
    .requiredOption("-v, --val", "the value for the new entry")
    .action(({key, value}) => configCommands.set(key, value));

program
    .command("get")
    .description("get an entry using key")
    .requiredOption("-k, --key", "key name you are looking for")
    .action(({key}) => configCommands.get(key));

program
    .command("delete")
    .description("remove an entry from config store")
    .requiredOption("-k, --key", "key name of entry we'll delete")
    .action(({key}) => configCommands.remove(key));

program
    .command("clear")
    .description("clear all env entries")
    .action(() => configCommands.clear());

program.parse(process.argv)