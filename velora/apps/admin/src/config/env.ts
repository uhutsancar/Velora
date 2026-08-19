/** Runtime configuration for the admin app. */
export const env = {
  apiUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:5000',
  mediaOrigin: import.meta.env.VITE_MEDIA_ORIGIN ?? 'http://localhost:5004',
  storefrontUrl: import.meta.env.VITE_STOREFRONT_URL ?? 'http://localhost:5173',
  appName: import.meta.env.VITE_APP_NAME ?? 'Velora Admin',
  currency: import.meta.env.VITE_CURRENCY ?? 'TRY',
  isProduction: import.meta.env.PROD,
} as const;

/**
 * Separate storage key from the storefront: signing into the shop must never
 * grant a session in the back office (and vice versa).
 */
export const SESSION_STORAGE_KEY = 'velora.admin.session';

export const DEFAULT_PAGE_SIZE = 20;
