import type { StorageKey } from './keys';

/**
 * One typed accessor per persisted value.
 *
 * Reading `window.localStorage` directly at a call site means repeating four
 * things every time: the SSR/private-mode guard, JSON parsing, a validity check
 * on data that a user can edit by hand, and a try/catch for the quota error
 * Safari throws in private browsing. This module does all four once.
 *
 * A stored value is untrusted input — the shopper can open devtools and put
 * anything under the key — so `validate` runs on every read and a value that
 * fails it is discarded in favour of the fallback rather than reaching a reducer.
 */

export type StorageArea = 'local' | 'session';

export interface StorageItem<T> {
  /** The stored value, or the fallback when absent, unparsable or invalid. */
  read(): T;
  write(value: T): void;
  remove(): void;
  /** Fires when another tab changes this key. Returns the unsubscribe function. */
  subscribe(listener: (value: T) => void): () => void;
}

export interface StorageItemOptions<T> {
  key: StorageKey;
  /** Returned whenever nothing usable is stored. */
  fallback: T;
  /**
   * Narrows the parsed JSON. Without one, any shape that parses is accepted,
   * which is only safe for values the app can tolerate being wrong.
   */
  validate?: (value: unknown) => value is T;
  area?: StorageArea;
}

/** Private mode and SSR both make storage unavailable; probing once is enough. */
function resolveArea(area: StorageArea): Storage | null {
  if (typeof window === 'undefined') return null;

  try {
    return area === 'session' ? window.sessionStorage : window.localStorage;
  } catch {
    // Chrome throws on access when third-party storage is blocked in an iframe.
    return null;
  }
}

export function createStorageItem<T>({
  key,
  fallback,
  validate,
  area = 'local',
}: StorageItemOptions<T>): StorageItem<T> {
  const storage = resolveArea(area);
  const listeners = new Set<(value: T) => void>();

  const read = (): T => {
    if (!storage) return fallback;

    try {
      const raw = storage.getItem(key);
      if (raw === null) return fallback;

      const parsed: unknown = JSON.parse(raw);

      if (validate && !validate(parsed)) return fallback;

      return parsed as T;
    } catch {
      return fallback;
    }
  };

  // Cross-tab updates only fire for localStorage, and only in the other tabs.
  if (storage && area === 'local' && typeof window !== 'undefined') {
    window.addEventListener('storage', (event) => {
      if (event.key !== key || listeners.size === 0) return;

      const value = read();
      listeners.forEach((listener) => listener(value));
    });
  }

  return {
    read,

    write(value) {
      if (!storage) return;

      try {
        storage.setItem(key, JSON.stringify(value));
      } catch {
        // Quota exceeded, or Safari private mode. A persisted preference is not
        // worth breaking the interaction that triggered the write.
      }
    },

    remove() {
      if (!storage) return;

      try {
        storage.removeItem(key);
      } catch {
        /* see write() */
      }
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

/** Type guard for the common "array of numbers" payload. */
export const isNumberArray = (value: unknown): value is number[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === 'number' && Number.isFinite(entry));

export const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean';
