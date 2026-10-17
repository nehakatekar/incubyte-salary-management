/** Source of "now", injected so date rules can be tested deterministically. */
export type Clock = () => Date;

export const systemClock: Clock = () => new Date();

export function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function formatIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
