import ConfigStore from "configstore";
import * as pkg from "../package.json";
import { RequiredConfigVars } from "../utils";

class KeyManager {
  conf: ConfigStore;
  constructor() {
    this.conf = new ConfigStore(pkg.name);
    this.populateInitialConfig();
  }

  set(key: string, value: string) {
    this.conf.set(key, value);
    return key;
  }

  get(key: string) {
    const apiKey = this.conf.get(key);
    if (!apiKey) {
      throw new Error("No Key Found");
    }
    return apiKey;
  }

  getAll() {
    return this.conf.all;
  }

  remove(key: string) {
    const value: string = this.conf.get(key);
    if (!value) {
      throw new Error("No Key Found");
    }
    this.conf.delete(key);
    return key;
  }

  clear() {
    this.conf.clear();
    this.populateInitialConfig();
  }

  private populateInitialConfig() {
    // initialize config map with all necessary config vars
    Object.keys(RequiredConfigVars)
      .filter((key) => isNaN(Number(key)))
      .map((key) => this.set(key, ""));
  }
}

const keyManager = new KeyManager();
export default keyManager;
