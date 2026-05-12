function createMemoryStorage(): Storage {
  const entries = new Map<string, string>();

  return {
    get length() {
      return entries.size;
    },
    clear() {
      entries.clear();
    },
    getItem(key: string) {
      return entries.get(key) ?? null;
    },
    key(index: number) {
      return Array.from(entries.keys())[index] ?? null;
    },
    removeItem(key: string) {
      entries.delete(key);
    },
    setItem(key: string, value: string) {
      entries.set(key, value);
    },
  };
}

function getUsableStorage(storage: Storage | undefined): Storage {
  return typeof storage?.getItem === "function" &&
    typeof storage.setItem === "function" &&
    typeof storage.clear === "function"
    ? storage
    : createMemoryStorage();
}

function installStorageGlobal(name: "localStorage" | "sessionStorage") {
  if (typeof window === "undefined") return;

  const storage = getUsableStorage(window[name]);
  Object.defineProperty(window, name, {
    configurable: true,
    value: storage,
  });
  Object.defineProperty(globalThis, name, {
    configurable: true,
    value: storage,
  });
}

installStorageGlobal("localStorage");
installStorageGlobal("sessionStorage");
