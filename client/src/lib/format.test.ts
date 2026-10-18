import {
  formatCompactMoney,
  formatDate,
  formatMoney,
  formatPercent,
  humanize,
  percentChange,
} from './format';

describe('format helpers', () => {
  it('formats whole-unit salaries in their own currency', () => {
    expect(formatMoney(55_400, 'GBP')).toBe('£55,400');
    expect(formatMoney(3_200_000, 'INR')).toBe('₹3,200,000');
  });

  it('compacts headline figures', () => {
    expect(formatCompactMoney(791_884_902, 'USD')).toBe('$791.9M');
    expect(formatCompactMoney(73_889, 'USD')).toBe('$73.9K');
  });

  it('formats calendar dates without shifting them across time zones', () => {
    expect(formatDate('2026-10-01')).toBe('1 Oct 2026');
  });

  it('turns enum values into labels', () => {
    expect(humanize('FULL_TIME')).toBe('Full time');
  });

  it('computes and formats signed percentage changes', () => {
    expect(formatPercent(percentChange(60_000, 66_000))).toBe('+10.0%');
    expect(formatPercent(percentChange(60_000, 30_000))).toBe('-50.0%');
    expect(formatPercent(0)).toBe('0.0%');
  });
});
