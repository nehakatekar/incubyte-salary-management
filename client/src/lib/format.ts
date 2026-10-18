const moneyFormatters = new Map<string, Intl.NumberFormat>();

/** Whole-unit salary in its own currency, e.g. 55400 GBP -> "£55,400". */
export function formatMoney(amount: number, currency: string): string {
  let formatter = moneyFormatters.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    });
    moneyFormatters.set(currency, formatter);
  }
  return formatter.format(amount);
}

/** Short form for headline figures and axes, e.g. 791884902 USD -> "$791.9M". */
export function formatCompactMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(amount);
}

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

/** "2026-10-01" -> "1 Oct 2026". Dates are calendar days, so they are formatted in UTC. */
export function formatDate(isoDate: string): string {
  return dateFormatter.format(new Date(`${isoDate}T00:00:00Z`));
}

/** "FULL_TIME" -> "Full time". */
export function humanize(value: string): string {
  const text = value.replace(/_/g, ' ').toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Relative change, e.g. 100 -> 110 = 0.1. */
export function percentChange(from: number, to: number): number {
  return (to - from) / from;
}

/** 0.0834 -> "+8.3%", -0.5 -> "-50.0%". */
export function formatPercent(ratio: number): string {
  const sign = ratio > 0 ? '+' : ratio < 0 ? '-' : '';
  return `${sign}${Math.abs(ratio * 100).toFixed(1)}%`;
}

/** Today's calendar date in UTC as YYYY-MM-DD, matching how the API compares dates. */
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
