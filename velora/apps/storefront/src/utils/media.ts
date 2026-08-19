import { resolveImageUrl } from '@velora/shared';
import { env } from '@/config/env';

/** Resolves a catalogue image path against the media origin. */
export const mediaUrl = (url: string | null | undefined): string | null =>
  resolveImageUrl(url, env.mediaOrigin);

/**
 * Placeholder used when a product has no artwork yet. Inline SVG so it costs no
 * request and still looks intentional rather than broken.
 */
export const PRODUCT_PLACEHOLDER =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500"><rect width="400" height="500" fill="#EFE9E0"/><path d="M150 230h100v70H150z" fill="none" stroke="#D2CEC7" stroke-width="2"/><circle cx="200" cy="205" r="18" fill="none" stroke="#D2CEC7" stroke-width="2"/><text x="200" y="360" font-family="serif" font-size="18" fill="#B0AAA0" text-anchor="middle">VELORA</text></svg>`,
  );

/**
 * Builds a `srcset` for a picsum/remote image so the browser can pick a size.
 * Local uploads have no resizer, so they are returned unchanged.
 */
export function buildSrcSet(url: string | null, widths: number[] = [400, 800, 1200]): string | undefined {
  if (!url) return undefined;

  const picsum = url.match(/^(https:\/\/picsum\.photos\/seed\/[^/]+)\/(\d+)\/(\d+)$/);
  if (!picsum) return undefined;

  const [, base, width, height] = picsum;
  const ratio = Number(height) / Number(width);

  return widths.map((w) => `${base}/${w}/${Math.round(w * ratio)} ${w}w`).join(', ');
}
