import '@testing-library/jest-dom';

// ---------------------------------------------------------------------------
// Node 25 exposes localStorage as a restricted Web Storage proxy that throws
// SecurityError unless --localstorage-file is passed to the runtime.
// Replace it with a plain in-memory Map-backed implementation so unit tests
// can call localStorage.setItem / getItem / removeItem / clear freely.
// ---------------------------------------------------------------------------

class MemoryStorage implements Storage {
  private _store = new Map<string, string>();

  get length(): number {
    return this._store.size;
  }

  key(index: number): string | null {
    return [...this._store.keys()][index] ?? null;
  }

  getItem(key: string): string | null {
    return this._store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this._store.set(key, value);
  }

  removeItem(key: string): void {
    this._store.delete(key);
  }

  clear(): void {
    this._store.clear();
  }
}

const memStorage = new MemoryStorage();

Object.defineProperty(globalThis, 'localStorage', {
  value: memStorage,
  writable: true,
  configurable: true,
});
