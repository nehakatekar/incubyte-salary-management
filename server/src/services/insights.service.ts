import { currencyForCountry } from '../domain/countries.js';
import { formatIsoDate } from '../domain/clock.js';
import { buildHistogram, niceBucketWidth } from '../domain/histogram.js';
import type { InsightsRepository, Scope, StatsRow } from '../repositories/insights.repository.js';

export const REPORTING_CURRENCY = 'USD';

/**
 * Answers "how does the org pay people?". Cross-country figures are in USD at
 * the static rates; single-country figures stay in that country's currency.
 * Only active employees are counted.
 */
export class InsightsService {
  constructor(private readonly insights: InsightsRepository) {}

  async summary() {
    const [[all], dimensions] = await Promise.all([
      this.insights.salaryStats(null, { unit: 'usd' }),
      this.insights.activeDimensions(),
    ]);
    return {
      reportingCurrency: REPORTING_CURRENCY,
      headcount: all?.headcount ?? 0,
      totalAnnualCost: Math.round(all?.total ?? 0),
      medianSalary: all ? Math.round(all.median) : null,
      averageSalary: all ? Math.round(all.average) : null,
      ...dimensions,
    };
  }

  async byCountry() {
    const [local, usd] = await Promise.all([
      this.insights.salaryStats('country', { unit: 'local' }),
      this.insights.salaryStats('country', { unit: 'usd' }),
    ]);
    const usdByCountry = new Map(usd.map((row) => [row.group, row]));

    return byHeadcountThenName(local).map((row) => ({
      country: row.group,
      currency: currencyForCountry(row.group),
      headcount: row.headcount,
      ...roundedRange(row),
      medianUsd: Math.round(usdByCountry.get(row.group)!.median),
      totalCostUsd: Math.round(usdByCountry.get(row.group)!.total),
    }));
  }

  async byDepartment() {
    const rows = await this.insights.salaryStats('department', { unit: 'usd' });
    return rows
      .sort((a, b) => b.total - a.total)
      .map((row) => ({
        department: row.group,
        headcount: row.headcount,
        totalCostUsd: Math.round(row.total),
        medianUsd: Math.round(row.median),
        averageUsd: Math.round(row.average),
      }));
  }

  async byJobTitle(country?: string) {
    const scope = scopeFor(country);
    const rows = await this.insights.salaryStats('jobTitle', scope);
    return {
      currency: currencyOf(scope),
      rows: byHeadcountThenName(rows).map((row) => ({
        jobTitle: row.group,
        headcount: row.headcount,
        ...roundedRange(row),
      })),
    };
  }

  async distribution(country?: string) {
    const scope = scopeFor(country);
    const { min, max } = await this.insights.salaryRange(scope);
    const width = min === null || max === null ? 1 : niceBucketWidth(min, max);
    const counts = await this.insights.bucketCounts(scope, width);
    return {
      currency: currencyOf(scope),
      bucketWidth: width,
      buckets: buildHistogram({ min, max, width, counts }),
    };
  }

  async recentChanges(limit: number) {
    const revisions = await this.insights.recentChanges(limit);
    return revisions.map((revision) => ({
      id: revision.id,
      employeeId: revision.employee.id,
      employeeCode: revision.employee.employeeCode,
      fullName: revision.employee.fullName,
      jobTitle: revision.employee.jobTitle,
      country: revision.employee.country,
      previousSalary: revision.previousSalary!,
      newSalary: revision.newSalary,
      currency: revision.currency,
      changePercent: roundTo1dp(
        ((revision.newSalary - revision.previousSalary!) / revision.previousSalary!) * 100,
      ),
      effectiveDate: formatIsoDate(revision.effectiveDate),
      reason: revision.reason,
    }));
  }
}

/** One country means one currency, so its figures stay local; otherwise compare in USD. */
function scopeFor(country?: string): Scope {
  return country ? { unit: 'local', country } : { unit: 'usd' };
}

function currencyOf(scope: Scope): string {
  return scope.country ? currencyForCountry(scope.country)! : REPORTING_CURRENCY;
}

function roundedRange(row: StatsRow) {
  return {
    min: Math.round(row.min),
    median: Math.round(row.median),
    average: Math.round(row.average),
    max: Math.round(row.max),
  };
}

function byHeadcountThenName(rows: StatsRow[]): StatsRow[] {
  return [...rows].sort((a, b) => b.headcount - a.headcount || a.group.localeCompare(b.group));
}

function roundTo1dp(value: number): number {
  return Math.round(value * 10) / 10;
}
