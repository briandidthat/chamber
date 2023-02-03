import ConfigStore from "configstore";
import inquirer from "inquirer";
import * as pkg from "../package.json";

const defaultConfig = {
  SIGNER: "SIGNER",
  PRIVATE_KEY: "PRIVATE_KEY",
  NETWORK: "eth",
}

class KeyManager {
  // initialize new Config store with default values
  private static conf: ConfigStore = new ConfigStore(pkg.name, defaultConfig);
  private static isInitialized: boolean = false;

  static set(key: string, value: string) {
    this.conf.set(key, value);
    return key;
  }

  static get(key: string) {
    const apiKey = this.conf.get(key);
    if (apiKey === undefined) {
      throw new Error("No Key Found");
    }
    return apiKey;
  }

  static getAll() {
    return this.conf.all;
  }

  static remove(key: string) {
    const value: string = this.conf.get(key);
    if (!value) {
      throw new Error("No Key Found");
    }
    this.conf.delete(key);
    return key;
  }

  static async clear() {
    const signer = this.conf.get("SIGNER");
    if (signer !== "SIGNER") {
      const { shouldClear } = await inquirer.prompt([
        {
          type: "confirm",
          name: "shouldClear",
          message: "There is a wallet configured. Would you like to delete it?"
        }
      ]);

      if (shouldClear) {
        this.conf.clear();
        this.isInitialized = false;
        this.populateInitialConfig();

        console.log("Config Cleared");
      }
    }
  }

  private static populateInitialConfig() {
    if (this.isInitialized) {
      return;
    }
    // initialize config map with all necessary config vars
    this.conf.set(defaultConfig)
    this.isInitialized = true;
  }
}

export default KeyManager;
