import ConfigStore from "configstore";
import * as pkg from "../package.json";
import { RequiredConfigVars } from "../utils";

class KeyManager {
  static conf: ConfigStore = new ConfigStore(pkg.name);
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
    Object.keys(RequiredConfigVars)
      .filter((key) => isNaN(Number(key)))
      .map((key) => this.set(key, ""));
    this.isInitialized = true;
  }
}

export default KeyManager;
