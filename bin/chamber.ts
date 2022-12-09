#!/usr/bin/env node

import { program } from "commander";

program
  .version("1.0.0")
  .command("swap", "Perform a swap related operation")
  .command("config", "manages configuration of config store")
  .command("fetch", "fetch crypto or account related data")
  .parse(process.argv);
