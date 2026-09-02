import { describe, expect, it } from 'vitest';
import { buildQueryString, cleanParams, resolveImageUrl, slugify } from './url';

describe('slugify', () => {
  it('folds Turkish characters instead of dropping them', () => {
    // The naive NFD approach loses ı/ş/ğ entirely, which would collapse
    // distinct product names onto the same slug.
    expect(slugify('Şık Deri Çanta')).toBe('sik-deri-canta');
    expect(slugify('Ilık Öğle Üzeri')).toBe('ilik-ogle-uzeri');
  });

  it('collapses separators and trims edges', () => {
    expect(slugify('  Aurora   Omuz  Çantası !! ')).toBe('aurora-omuz-cantasi');
  });

  it('returns an empty string for empty input', () => {
    expect(slugify('')).toBe('');
    expect(slugify('!!!')).toBe('');
  });

  it('matches the backend slug for the seeded catalogue names', () => {
    expect(slugify('Meridian Weekender')).toBe('meridian-weekender');
    expect(slugify('Kaan Deri Cüzdan')).toBe('kaan-deri-cuzdan');
  });
});

describe('buildQueryString', () => {
  it('drops empty, null and false values', () => {
    const query = buildQueryString({
      search: 'çanta',
      brand: '',
      category: null,
      inStock: false,
      onSale: true,
      pageIndex: 0,
    });

    expect(query).toBe('?search=%C3%A7anta&onSale=true&pageIndex=0');
  });

  it('joins array values with commas', () => {
    expect(buildQueryString({ color: ['Siyah', 'Taba'] })).toBe('?color=Siyah%2CTaba');
  });

  it('returns an empty string when nothing survives', () => {
    expect(buildQueryString({ a: undefined, b: '', c: false })).toBe('');
  });
});

describe('cleanParams', () => {
  it('removes undefined, null and empty string entries', () => {
    expect(cleanParams({ a: 1, b: undefined, c: null, d: '', e: false })).toEqual({ a: 1, e: false });
  });
});

describe('resolveImageUrl', () => {
  const origin = 'http://localhost:5004';

  it('prefixes rooted media paths with the API origin', () => {
    expect(resolveImageUrl('/media/x.jpg', origin)).toBe('http://localhost:5004/media/x.jpg');
  });

  it('leaves absolute URLs untouched', () => {
    expect(resolveImageUrl('https://cdn.example.com/a.jpg', origin)).toBe('https://cdn.example.com/a.jpg');
  });

  it('leaves data URIs untouched', () => {
    expect(resolveImageUrl('data:image/svg+xml;utf8,<svg/>', origin)).toMatch(/^data:/);
  });

  it('returns null for missing input', () => {
    expect(resolveImageUrl(null, origin)).toBeNull();
    expect(resolveImageUrl(undefined, origin)).toBeNull();
  });
});
