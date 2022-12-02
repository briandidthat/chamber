const keyManager = require("../lib/KeyManager");

const configCommands = {
  set(key, value) {
    console.log(keyManager.set(key, value));
  },
  get(key) {
    console.log(keyManager.get(key));
  },
  remove(key) {
    console.log(keyManager.remove(key));
  },
  clear() {
    keyManager.clear();
    console.log("Config Cleared");
  },
};

module.exports = configCommands;
