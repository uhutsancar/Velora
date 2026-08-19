import { ORDER_STATUS } from '@velora/shared';
import { describe, expect, it } from 'vitest';
import { CATEGORICAL_PALETTE, compactNumber, ORDER_STATUS_COLORS } from './chartTheme';

describe('compactNumber', () => {
  it('leaves small values untouched', () => {
    expect(compactNumber(0)).toBe('0');
    expect(compactNumber(999)).toBe('999');
  });

  it('abbreviates thousands with a Turkish decimal comma', () => {
    expect(compactNumber(12_500)).toBe('12,5B');
    expect(compactNumber(1_000)).toBe('1,0B');
  });

  it('abbreviates millions', () => {
    expect(compactNumber(2_400_000)).toBe('2,4Mn');
  });

  it('handles negatives (a refund-heavy day)', () => {
    expect(compactNumber(-5_000)).toBe('-5,0B');
  });
});

describe('ORDER_STATUS_COLORS', () => {
  it('assigns a colour to every order status the backend can return', () => {
    for (const statusId of Object.values(ORDER_STATUS)) {
      expect(ORDER_STATUS_COLORS[statusId]).toMatch(/^#[0-9A-F]{6}$/i);
    }
  });

  it('uses distinct colours for paid, shipped and cancelled', () => {
    const critical = [
      ORDER_STATUS_COLORS[ORDER_STATUS.Paid],
      ORDER_STATUS_COLORS[ORDER_STATUS.Shipped],
      ORDER_STATUS_COLORS[ORDER_STATUS.Cancelled],
    ];

    expect(new Set(critical).size).toBe(3);
  });
});

describe('CATEGORICAL_PALETTE', () => {
  it('has no duplicate entries, so two series never share a colour', () => {
    expect(new Set(CATEGORICAL_PALETTE).size).toBe(CATEGORICAL_PALETTE.length);
  });

  it('contains only valid hex colours', () => {
    for (const colour of CATEGORICAL_PALETTE) {
      expect(colour).toMatch(/^#[0-9A-F]{6}$/i);
    }
  });
});
