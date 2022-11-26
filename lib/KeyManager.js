const ConfigStore = require("configstore");
const pkg = require("../package.json");

class KeyManager {
    constructor() {
        this.conf = new ConfigStore(pkg.name);
    }

    set(key, value) {
        this.conf.set(key, value);
        return key;
    }

    get(key) {
        const apiKey = this.conf.get(key);
        if (!apiKey) {
            throw new Error("No Key Found");
        }
        return apiKey;
    }

    remove(key) {
        const value = this.conf.get(key);
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

module.exports = keyManager;