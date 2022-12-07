import keyManager from "../lib/KeyManager";

const configCommands = {
  set(key: string, val: string) {
    console.log(keyManager.set(key, val));
  },
  get(key: string) {
    console.log(keyManager.get(key));
  },
  remove(key: string) {
    console.log(keyManager.remove(key));
  },
  clear() {
    keyManager.clear();
    console.log("Config Cleared");
  },
};

export default configCommands;
