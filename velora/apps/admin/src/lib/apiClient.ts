import { createApiClient } from '@velora/shared';
import { env, SESSION_STORAGE_KEY } from '@/config/env';

/** Single HTTP entry point for the admin app. */
export const apiClient = createApiClient({
  baseUrl: env.apiUrl,
  storageKey: SESSION_STORAGE_KEY,
  // Analytics queries scan a date window and can be slower than storefront reads.
  timeoutMs: 30_000,
  onUnauthorized: () => {
    if (typeof window === 'undefined') return;
    if (window.location.pathname.startsWith('/login')) return;

    const redirect = encodeURIComponent(`${window.location.pathname}${window.location.search}`);
    window.location.assign(`/login?redirect=${redirect}`);
  },
});
