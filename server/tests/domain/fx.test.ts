import { describe, expect, it } from 'vitest';
import { COUNTRIES } from '../../src/domain/countries.js';
import { fromUsd, toUsd, USD_RATES } from '../../src/domain/fx.js';

describe('fx', () => {
  it('converts local amounts to USD at the fixed rate', () => {
    expect(toUsd(8_300_000, 'INR')).toBe(100_000);
    expect(toUsd(100_000, 'USD')).toBe(100_000);
    expect(toUsd(79_000, 'GBP')).toBeCloseTo(100_000, 6);
  });

  it('round-trips through USD', () => {
    expect(toUsd(fromUsd(1_234, 'EUR'), 'EUR')).toBeCloseTo(1_234, 6);
  });

  it('has a rate for every supported country currency', () => {
    for (const { currency } of COUNTRIES) {
      expect(USD_RATES[currency]).toBeGreaterThan(0);
    }
  });

  it('refuses an unknown currency rather than guessing', () => {
    expect(() => toUsd(1, 'XYZ')).toThrow('Unsupported currency: XYZ');
  });
});
