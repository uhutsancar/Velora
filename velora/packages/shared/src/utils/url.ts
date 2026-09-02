/** Turkish-aware slug generation, matching Velora.Shared.Text.Slug on the backend. */
const TURKISH_MAP: Record<string, string> = {
  ç: 'c',
  Ç: 'c',
  ğ: 'g',
  Ğ: 'g',
  ı: 'i',
  I: 'i',
  İ: 'i',
  ö: 'o',
  Ö: 'o',
  ş: 's',
  Ş: 's',
  ü: 'u',
  Ü: 'u',
};

export function slugify(value: string): string {
  if (!value) return '';

  return value
    .split('')
    .map((char) => TURKISH_MAP[char] ?? char.toLowerCase())
    .join('')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Builds a query string, dropping empty values so the URL stays clean and two
 * equivalent filter states produce the same cache key.
 */
export function buildQueryString(params: Record<string, unknown>): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;

    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      search.set(key, value.join(','));
      continue;
    }

    if (typeof value === 'boolean') {
      if (!value) continue;
      search.set(key, 'true');
      continue;
    }

    // Only primitives have a meaningful query representation. Anything else is
    // skipped rather than emitted as "[object Object]", which would silently
    // produce a URL that filters nothing.
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'bigint') {
      search.set(key, String(value));
    }
  }

  const query = search.toString();
  return query ? `?${query}` : '';
}

/** Strips undefined/null/empty entries so axios never serialises `?foo=`. */
export function cleanParams<T extends Record<string, unknown>>(params: T): Partial<T> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    result[key] = value;
  }

  return result as Partial<T>;
}

/**
 * Resolves an image reference to an absolute URL.
 * Backend media paths are rooted ("/media/x.jpg") and must be prefixed with the
 * API origin; seeded demo images are already absolute and pass through untouched.
 */
export function resolveImageUrl(url: string | null | undefined, apiOrigin: string): string | null {
  if (!url) return null;
  if (/^(https?:)?\/\//i.test(url) || url.startsWith('data:')) return url;

  return `${apiOrigin.replace(/\/+$/, '')}/${url.replace(/^\/+/, '')}`;
}
