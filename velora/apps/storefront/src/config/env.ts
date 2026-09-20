import { COMMERCE, runtimeValue, STORAGE_KEYS } from '@velora/shared';

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

/**
 * The storefront session key. Declared in the shared registry so the admin app,
 * which shares this origin in production, cannot pick the same one.
 */
export const SESSION_STORAGE_KEY = STORAGE_KEYS.storefrontSession;

/**
 * Commercial terms are re-exported rather than redeclared: the basket, the
 * checkout total and the help centre all have to quote the same numbers.
 */
export const FREE_SHIPPING_THRESHOLD = COMMERCE.freeShippingThreshold;
export const SHIPPING_FEE = COMMERCE.shippingFee;

/** Products per page in the catalogue grid. Tuned to the 4-column layout. */
export const PAGE_SIZE = 12;
