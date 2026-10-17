export interface Country {
  name: string;
  /** ISO 4217 currency code salaries are paid in. */
  currency: string;
}

export const COUNTRIES: readonly Country[] = [
  { name: 'United States', currency: 'USD' },
  { name: 'India', currency: 'INR' },
  { name: 'United Kingdom', currency: 'GBP' },
  { name: 'Germany', currency: 'EUR' },
  { name: 'Canada', currency: 'CAD' },
  { name: 'Netherlands', currency: 'EUR' },
  { name: 'Australia', currency: 'AUD' },
  { name: 'Singapore', currency: 'SGD' },
];

export function currencyForCountry(country: string): string | undefined {
  return COUNTRIES.find((c) => c.name === country)?.currency;
}
