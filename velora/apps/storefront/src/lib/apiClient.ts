import { createApiClient } from '@velora/shared';
import { env, SESSION_STORAGE_KEY } from '@/config/env';

/**
 * Single axios instance for the whole storefront.
 *
 * Everything token-, retry- and error-related lives in `createApiClient`, so no
 * component or slice ever touches axios directly.
 */
export const apiClient = createApiClient({
  baseUrl: env.apiUrl,
  storageKey: SESSION_STORAGE_KEY,
  timeoutMs: 20_000,
  onUnauthorized: () => {
    // The refresh chain is exhausted. Send the shopper to login, keeping the
    // current location so they land back where they were.
    if (typeof window === 'undefined') return;

    const { pathname, search } = window.location;

    // Already on an auth screen: nothing to redirect.
    if (pathname.startsWith('/giris') || pathname.startsWith('/kayit')) return;

    const redirect = encodeURIComponent(`${pathname}${search}`);
    window.location.assign(`/giris?redirect=${redirect}`);
  },
});
