// Node-side unit tests install the browser storage before importing Zustand.
const memory = new Map<string, string>();
export const testStorage = {
  getItem: (key: string) => memory.get(key) || null,
  setItem: (key: string, value: string) => { memory.set(key, value); },
  removeItem: (key: string) => { memory.delete(key); },
};
export function installTestStorage() {
  memory.clear();
  Object.defineProperty(globalThis, 'window', { value: {}, configurable: true });
  Object.defineProperty(globalThis, 'sessionStorage', { value: testStorage, configurable: true });
}
installTestStorage();
