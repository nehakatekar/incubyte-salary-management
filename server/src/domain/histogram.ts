export interface HistogramBucket {
  /** Inclusive lower bound. */
  from: number;
  /** Exclusive upper bound. */
  to: number;
  count: number;
}

const DEFAULT_TARGET_BUCKETS = 20;

/**
 * A human-friendly bucket width (1, 2, 2.5 or 5 x 10^n) giving roughly
 * `targetBuckets` buckets between min and max, e.g. 80k..200k -> 10k.
 */
export function niceBucketWidth(
  min: number,
  max: number,
  targetBuckets = DEFAULT_TARGET_BUCKETS,
): number {
  const raw = max > min ? (max - min) / targetBuckets : Math.max(Math.abs(max), 1) * 0.1;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const residual = raw / magnitude;
  const step =
    residual <= 1 ? 1 : residual <= 2 ? 2 : residual <= 2.5 ? 2.5 : residual <= 5 ? 5 : 10;
  return step * magnitude;
}

/**
 * Turns sparse counts keyed by bucket index (floor(amount / width)) into a
 * contiguous list from the bucket holding `min` to the one holding `max`.
 */
export function buildHistogram({
  min,
  max,
  width,
  counts,
}: {
  min: number | null;
  max: number | null;
  width: number;
  counts: ReadonlyMap<number, number>;
}): HistogramBucket[] {
  if (min === null || max === null) return [];

  const first = Math.floor(min / width);
  const last = Math.floor(max / width);
  return Array.from({ length: last - first + 1 }, (_, i) => {
    const index = first + i;
    return { from: index * width, to: (index + 1) * width, count: counts.get(index) ?? 0 };
  });
}
