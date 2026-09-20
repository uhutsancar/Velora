/**
 * @vitest-environment jsdom
 *
 * The rest of the shared package is pure data and runs under the faster `node`
 * environment configured in vitest.config.ts. This module is the one part that
 * genuinely touches the DOM, so it opts itself into jsdom per file rather than
 * slowing every other suite down.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createStorageItem, isBoolean, isNumberArray } from './browserStorage';
import { STORAGE_KEYS } from './keys';

const KEY = STORAGE_KEYS.recentlyViewed;

describe('createStorageItem', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('returns the fallback when nothing is stored', () => {
    const item = createStorageItem<number[]>({ key: KEY, fallback: [], validate: isNumberArray });

    expect(item.read()).toEqual([]);
  });

  it('round-trips a value through storage', () => {
    const item = createStorageItem<number[]>({ key: KEY, fallback: [], validate: isNumberArray });

    item.write([3, 1, 2]);

    expect(item.read()).toEqual([3, 1, 2]);
    expect(window.localStorage.getItem(KEY)).toBe('[3,1,2]');
  });

  it('falls back rather than throwing on a value that is not JSON', () => {
    // A user editing devtools, or a key left over from an older schema.
    window.localStorage.setItem(KEY, 'not json at all');

    const item = createStorageItem<number[]>({ key: KEY, fallback: [], validate: isNumberArray });

    expect(item.read()).toEqual([]);
  });

  it('rejects a parsable value of the wrong shape', () => {
    window.localStorage.setItem(KEY, JSON.stringify(['1', { id: 2 }]));

    const item = createStorageItem<number[]>({ key: KEY, fallback: [], validate: isNumberArray });

    expect(item.read()).toEqual([]);
  });

  it('accepts anything parsable when no validator is given', () => {
    const item = createStorageItem<unknown>({ key: KEY, fallback: null });

    item.write({ anything: true });

    expect(item.read()).toEqual({ anything: true });
  });

  it('removes the key', () => {
    const item = createStorageItem<boolean>({
      key: STORAGE_KEYS.adminSidebarCollapsed,
      fallback: false,
      validate: isBoolean,
    });

    item.write(true);
    item.remove();

    expect(item.read()).toBe(false);
    expect(window.localStorage.getItem(STORAGE_KEYS.adminSidebarCollapsed)).toBeNull();
  });

  it('swallows a quota error instead of breaking the interaction', () => {
    const item = createStorageItem<number[]>({ key: KEY, fallback: [], validate: isNumberArray });

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });

    expect(() => item.write([1])).not.toThrow();
  });

  it('notifies subscribers when another tab changes the key', () => {
    const item = createStorageItem<number[]>({ key: KEY, fallback: [], validate: isNumberArray });
    const listener = vi.fn();

    item.subscribe(listener);

    // jsdom does not dispatch `storage` for same-document writes, which matches
    // the browser: the event only fires in the *other* tabs. Simulate the peer.
    window.localStorage.setItem(KEY, JSON.stringify([7]));
    window.dispatchEvent(new StorageEvent('storage', { key: KEY }));

    expect(listener).toHaveBeenCalledWith([7]);
  });

  it('ignores storage events for other keys', () => {
    const item = createStorageItem<number[]>({ key: KEY, fallback: [], validate: isNumberArray });
    const listener = vi.fn();

    item.subscribe(listener);
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEYS.language }));

    expect(listener).not.toHaveBeenCalled();
  });

  it('stops notifying after unsubscribe', () => {
    const item = createStorageItem<number[]>({ key: KEY, fallback: [], validate: isNumberArray });
    const listener = vi.fn();

    const unsubscribe = item.subscribe(listener);
    unsubscribe();

    window.localStorage.setItem(KEY, JSON.stringify([9]));
    window.dispatchEvent(new StorageEvent('storage', { key: KEY }));

    expect(listener).not.toHaveBeenCalled();
  });
});

describe('storage keys', () => {
  it('keeps the storefront and admin sessions on separate keys', () => {
    // The two apps share an origin in production. If these ever collide,
    // signing into the shop hands out a back-office session.
    expect(STORAGE_KEYS.storefrontSession).not.toBe(STORAGE_KEYS.adminSession);
  });

  it('namespaces every key', () => {
    for (const key of Object.values(STORAGE_KEYS)) {
      expect(key.startsWith('velora.')).toBe(true);
    }
  });

  it('declares no key twice', () => {
    const values = Object.values(STORAGE_KEYS);

    expect(new Set(values).size).toBe(values.length);
  });
});

describe('type guards', () => {
  it('isNumberArray accepts only finite number arrays', () => {
    expect(isNumberArray([])).toBe(true);
    expect(isNumberArray([1, 2])).toBe(true);
    expect(isNumberArray([1, Number.NaN])).toBe(false);
    expect(isNumberArray(['1'])).toBe(false);
    expect(isNumberArray(null)).toBe(false);
  });

  it('isBoolean accepts only booleans', () => {
    expect(isBoolean(true)).toBe(true);
    expect(isBoolean('true')).toBe(false);
    expect(isBoolean(0)).toBe(false);
  });
});
