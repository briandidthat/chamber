import ConfigStore from "configstore";
import * as pkg from "../package.json";

const defaultConfig = {
  SIGNER: "SIGNER",
  PRIVATE_KEY: "PRIVATE_KEY",
  NETWORK: "NETWORK",
}

class KeyManager {
  // initialize new Config store with default values
  static conf: ConfigStore = new ConfigStore(pkg.name, defaultConfig);
  static isInitialized: boolean = false;

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

  static clear() {
    this.conf.clear();
    this.isInitialized = false;
    this.populateInitialConfig();
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
