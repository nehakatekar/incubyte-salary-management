import { describe, expect, it } from 'vitest';
import { buildHistogram, niceBucketWidth } from '../../src/domain/histogram.js';

describe('niceBucketWidth', () => {
  it.each([
    // [min, max, expected width] with the default target of ~20 buckets
    [80_000, 200_000, 10_000], // raw 6,000 -> 10,000
    [14_000, 330_000, 20_000], // raw 15,800 -> 20,000
    [1_000_000, 6_500_000, 500_000], // raw 275,000 -> 500,000
    [40_000, 50_000, 500], // raw 500 -> 500
    [30_000, 55_000, 2_000], // raw 1,250 -> 2,000
    [100_000, 144_000, 2_500], // raw 2,200 -> 2,500
  ])('picks a round width for %i..%i', (min, max, expected) => {
    expect(niceBucketWidth(min, max)).toBe(expected);
  });

  it('only ever uses 1, 2, 2.5 or 5 times a power of ten', () => {
    for (const [min, max] of [
      [1, 7],
      [10, 999],
      [123, 98_765],
      [5_000, 5_000_000],
    ] as const) {
      const width = niceBucketWidth(min, max);
      const mantissa = width / 10 ** Math.floor(Math.log10(width));
      expect([1, 2, 2.5, 5]).toContain(Number(mantissa.toFixed(6)));
    }
  });

  it('falls back to a sensible width when every salary is the same', () => {
    expect(niceBucketWidth(50_000, 50_000)).toBe(5_000);
  });
});

describe('buildHistogram', () => {
  it('lays out contiguous buckets from min to max, filling gaps with zero', () => {
    const counts = new Map([
      [8, 1],
      [10, 2],
      [20, 1],
    ]);

    const buckets = buildHistogram({ min: 80_000, max: 200_000, width: 10_000, counts });

    expect(buckets).toHaveLength(13);
    expect(buckets[0]).toEqual({ from: 80_000, to: 90_000, count: 1 });
    expect(buckets[1]).toEqual({ from: 90_000, to: 100_000, count: 0 });
    expect(buckets[2]).toEqual({ from: 100_000, to: 110_000, count: 2 });
    expect(buckets.at(-1)).toEqual({ from: 200_000, to: 210_000, count: 1 });
    expect(buckets.reduce((sum, b) => sum + b.count, 0)).toBe(4);
  });

  it('returns no buckets when there is no data', () => {
    expect(buildHistogram({ min: null, max: null, width: 1, counts: new Map() })).toEqual([]);
  });
});
