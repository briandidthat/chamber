import { program } from "commander";
import configCommands from "../commands/config";
import { KeyPair } from "../lib/types";

program
  .command("set")
  .description("store a new entry")
  .requiredOption("-k, --key <key>", "the key for the new entry")
  .requiredOption("-v, --val <val>", "the value for the new entry")
  .action(({ key, val }: KeyPair) => configCommands.set(key, val));

program
  .command("get")
  .description("get an entry using key")
  .requiredOption("-k, --key <key>", "key name you are looking for")
  .action(({ key }: { key: string }) => configCommands.get(key));

program
  .command("show")
  .description("show all env entries")
  .action(() => configCommands.show());

program
  .command("delete")
  .description("remove an entry from config store")
  .requiredOption("-k, --key <key>", "key name of entry we'll delete")
  .action(({ key }: { key: string }) => configCommands.remove(key));

program
  .command("clear")
  .description("clear all env entries")
  .action(async () => await configCommands.clear());

program.parse(process.argv);
