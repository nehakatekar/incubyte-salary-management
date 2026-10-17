/**
 * Static exchange rates: units of each currency per 1 USD.
 * Deliberately fixed so analytics are deterministic (see docs/requirements.md).
 */
export const USD_RATES: Readonly<Record<string, number>> = {
  USD: 1,
  INR: 83,
  GBP: 0.79,
  EUR: 0.92,
  CAD: 1.36,
  AUD: 1.52,
  SGD: 1.34,
};

function rateFor(currency: string): number {
  const rate = USD_RATES[currency];
  if (rate === undefined) throw new Error(`Unsupported currency: ${currency}`);
  return rate;
}

export function toUsd(amount: number, currency: string): number {
  return amount / rateFor(currency);
}

export function fromUsd(amountUsd: number, currency: string): number {
  return amountUsd * rateFor(currency);
}
