import KeyManager from "../lib/KeyManager";

const configCommands = {
  set(key: string, val: string) {
    console.log(KeyManager.set(key, val));
  },
  get(key: string) {
    console.log(KeyManager.get(key));
  },
  show() {
    console.log(KeyManager.getAll());
  },
  remove(key: string) {
    console.log(KeyManager.remove(key));
  },
  async clear() {
    await KeyManager.clear();
    console.log("Config Cleared");
  },
};

export default configCommands;
