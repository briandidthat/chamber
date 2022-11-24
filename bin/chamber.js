#!/usr/bin/env node

const {program} = require("commander");

program
    .version("1.0.0")
    .command("swap", "Perform a swap operation")
    .command("deploy", "Deploy a contract")
    .command("fetch", "fetch the price of a specific crypto asset")
    .command("manage", "manage a deployed chamber")
    .parse(process.argv)

