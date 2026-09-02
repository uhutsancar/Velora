import { describe, expect, it } from 'vitest';
import { formatCardNumber, formatCurrency, formatDate, formatNumber, maskCardNumber } from './format';

/** Intl inserts narrow no-break spaces; normalise them so assertions stay readable. */
const normalise = (value: string) => value.replace(/[\u00A0\u202F\u2007]/g, ' ');

describe('formatCurrency', () => {
  it('formats Turkish lira with two decimals', () => {
    expect(normalise(formatCurrency(4890, 'tr-TR', 'TRY'))).toBe('₺4.890,00');
  });

  it('formats the same amount differently per locale', () => {
    expect(normalise(formatCurrency(1234.5, 'en-GB', 'TRY'))).toContain('1,234.50');
  });

  it('treats null and undefined as zero rather than crashing', () => {
    expect(normalise(formatCurrency(null, 'tr-TR', 'TRY'))).toBe('₺0,00');
    expect(normalise(formatCurrency(undefined, 'tr-TR', 'TRY'))).toBe('₺0,00');
  });

  it('treats NaN as zero', () => {
    expect(normalise(formatCurrency(Number.NaN, 'tr-TR', 'TRY'))).toBe('₺0,00');
  });
});

describe('formatNumber', () => {
  it('groups thousands for the active locale', () => {
    expect(formatNumber(1234567, 'tr-TR')).toBe('1.234.567');
  });
});

describe('formatDate', () => {
  it('returns a dash for missing input instead of "Invalid Date"', () => {
    expect(formatDate(null)).toBe('-');
    expect(formatDate(undefined)).toBe('-');
    expect(formatDate('not-a-date')).toBe('-');
  });

  it('formats an ISO timestamp', () => {
    expect(formatDate('2026-08-19T10:00:00Z', 'tr-TR')).toMatch(/2026/);
  });
});

describe('card helpers', () => {
  it('groups a card number into blocks of four', () => {
    expect(formatCardNumber('4242424242424242')).toBe('4242 4242 4242 4242');
  });

  it('ignores non-digits and caps the length', () => {
    expect(formatCardNumber('4242-4242-4242-4242-9999')).toBe('4242 4242 4242 4242 999');
  });

  it('masks everything but the last four digits', () => {
    expect(maskCardNumber('4242424242424242')).toBe('**** **** **** 4242');
  });

  it('never leaks a short value', () => {
    expect(maskCardNumber('42')).toBe('****');
  });
});
