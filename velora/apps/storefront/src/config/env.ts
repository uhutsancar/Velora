import { runtimeValue } from '@velora/shared';

/**
 * Runtime configuration, read once from Vite env vars.
 * Missing values fall back to the local development stack so `pnpm dev` works
 * without a .env file.
 */
export const env = {
  apiUrl: runtimeValue('apiUrl') ?? import.meta.env.VITE_API_URL ?? 'http://localhost:5000',
  mediaOrigin: runtimeValue('mediaOrigin') ?? import.meta.env.VITE_MEDIA_ORIGIN ?? 'http://localhost:5004',
  siteUrl: runtimeValue('siteUrl') ?? import.meta.env.VITE_SITE_URL ?? 'http://localhost:5173',
  siteName: import.meta.env.VITE_SITE_NAME ?? 'Velora',
  currency: import.meta.env.VITE_CURRENCY ?? 'TRY',
  isProduction: import.meta.env.PROD,
} as const;

/** localStorage key for the storefront session; the admin app uses a different one. */
export const SESSION_STORAGE_KEY = 'velora.store.session';

/** Free shipping threshold, mirrored from the KARGO coupon in the catalogue seed. */
export const FREE_SHIPPING_THRESHOLD = 500;

export const SHIPPING_FEE = 49.9;

export const PAGE_SIZE = 12;
