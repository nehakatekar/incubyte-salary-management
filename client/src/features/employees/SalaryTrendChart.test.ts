import { salaryAxisTicks, timeTickFormatter } from './SalaryTrendChart';

describe('salaryAxisTicks', () => {
  it('starts well below the lowest salary so a modest raise looks modest', () => {
    // 51,500 -> 55,400 is +7.6%; a tight axis would draw it as a cliff.
    expect(salaryAxisTicks(51_500, 55_400)).toEqual([40_000, 45_000, 50_000, 55_000, 60_000]);
  });

  it('uses round steps and always covers the highest salary', () => {
    const ticks = salaryAxisTicks(2_485_900, 3_395_500);

    expect(ticks.at(-1)).toBeGreaterThanOrEqual(3_395_500);
    expect(ticks[0]).toBeLessThanOrEqual(2_485_900 * 0.85);
    const steps = new Set(ticks.slice(1).map((tick, i) => tick - ticks[i]!));
    expect(steps.size).toBe(1);
    const [step] = steps;
    expect([1, 2, 2.5, 5]).toContain(step! / 10 ** Math.floor(Math.log10(step!)));
  });
});

describe('timeTickFormatter', () => {
  const at = (date: string) => Date.parse(`${date}T00:00:00Z`);

  it('labels long histories by year', () => {
    expect(timeTickFormatter(at('2016-05-25'), at('2026-10-18'))(at('2020-03-01'))).toBe('2020');
  });

  it('adds the month when a history is short enough for years to repeat', () => {
    expect(timeTickFormatter(at('2025-05-12'), at('2026-10-18'))(at('2026-05-23'))).toBe(
      'May 2026',
    );
  });
});
