import ConfigStore from "configstore";
import * as pkg from "../package.json";

class KeyManager {
  conf: ConfigStore;
  constructor() {
    this.conf = new ConfigStore(pkg.name);
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
  }
}

const keyManager = new KeyManager();
export default keyManager;
