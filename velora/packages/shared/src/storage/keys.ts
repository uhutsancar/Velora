/**
 * Every browser-storage key Velora writes, in one registry.
 *
 * Keys used to be declared as a loose `const FOO_KEY = '...'` next to whichever
 * slice happened to need them. That has three costs: two apps sharing an origin
 * can silently collide, nothing stops a typo from reading a key that never
 * existed, and there is no single place to look when a storage schema changes.
 *
 * The namespace is `velora.<app>.<concern>`; `velora.<concern>` is reserved for
 * values both apps share. Anything persisted goes through `createStorageItem`
 * in ./browserStorage, never through `window.localStorage` directly.
 */

const NAMESPACE = 'velora';

export const STORAGE_KEYS = {
  /** Shared: the active UI language. */
  language: `${NAMESPACE}.language`,

  /**
   * Sessions are deliberately per-app. Signing into the shop must never grant a
   * session in the back office, and the two apps share an origin in production.
   */
  storefrontSession: `${NAMESPACE}.store.session`,
  adminSession: `${NAMESPACE}.admin.session`,

  /** Storefront: product ids the shopper looked at, newest first. */
  recentlyViewed: `${NAMESPACE}.recentlyViewed`,

  /** Storefront: cookie categories the visitor consented to. */
  cookieConsent: `${NAMESPACE}.store.cookieConsent`,

  /** Admin: whether the navigation rail is collapsed. */
  adminSidebarCollapsed: `${NAMESPACE}.admin.sidebarCollapsed`,
} as const;

export type StorageKeyName = keyof typeof STORAGE_KEYS;
export type StorageKey = (typeof STORAGE_KEYS)[StorageKeyName];
