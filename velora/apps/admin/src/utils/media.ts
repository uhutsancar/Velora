import { resolveImageUrl } from '@velora/shared';
import { env } from '@/config/env';

export const mediaUrl = (url: string | null | undefined): string | null =>
  resolveImageUrl(url, env.mediaOrigin);

/** Neutral placeholder for products without artwork. */
export const PRODUCT_PLACEHOLDER =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 100"><rect width="80" height="100" fill="#EFEEEC"/><rect x="24" y="38" width="32" height="24" fill="none" stroke="#D2CEC7"/></svg>`,
  );
