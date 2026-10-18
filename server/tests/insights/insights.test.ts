import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { insertEmployee } from '../helpers/fixtures.js';
import { createTestDb, type TestDb } from '../helpers/test-db.js';

/**
 * Hand-checkable org. USD equivalents use the fixed rates (INR 83, GBP 0.79):
 *
 *   name   country  dept         title              local        USD
 *   us1    US       Engineering  Software Engineer  100,000 USD  100,000
 *   us2    US       Engineering  Software Engineer  120,000 USD  120,000
 *   us3    US       Engineering  Staff Engineer     200,000 USD  200,000
 *   us4    US       Sales        Account Executive   80,000 USD   80,000
 *   in1    India    Engineering  Software Engineer  8,300,000 INR 100,000
 *   in2    India    Engineering  Software Engineer  4,150,000 INR  50,000
 *   uk1    UK       Sales        Account Executive   79,000 GBP  100,000
 *   gone   US       Engineering  Software Engineer  1,000,000 USD (terminated: excluded)
 *
 * Sorted USD: 50, 80, 100, 100, 100, 120, 200 (thousands) -> median 100k, total 750k.
 */
let db: TestDb;
let api: ReturnType<typeof request>;
const ids: Record<string, number> = {};

beforeAll(async () => {
  db = await createTestDb();
  api = request(createApp({ prisma: db.prisma }));

  const people = [
    ['us1', 'United States', 'Engineering', 'Software Engineer', 100_000],
    ['us2', 'United States', 'Engineering', 'Software Engineer', 120_000],
    ['us3', 'United States', 'Engineering', 'Staff Engineer', 200_000],
    ['us4', 'United States', 'Sales', 'Account Executive', 80_000],
    ['in1', 'India', 'Engineering', 'Software Engineer', 8_300_000],
    ['in2', 'India', 'Engineering', 'Software Engineer', 4_150_000],
    ['uk1', 'United Kingdom', 'Sales', 'Account Executive', 79_000],
  ] as const;
  for (const [fullName, country, department, jobTitle, salary] of people) {
    const employee = await insertEmployee(db.prisma, {
      fullName,
      country,
      department,
      jobTitle,
      salary,
    });
    ids[fullName] = employee.id;
  }
  await insertEmployee(db.prisma, { fullName: 'gone', salary: 1_000_000, status: 'TERMINATED' });
});
afterAll(() => db.destroy());

describe('GET /api/insights/summary', () => {
  it('summarises active headcount and pay in USD', async () => {
    const res = await api.get('/api/insights/summary');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      reportingCurrency: 'USD',
      headcount: 7,
      totalAnnualCost: 750_000,
      medianSalary: 100_000,
      averageSalary: 107_143, // 750,000 / 7 = 107,142.86
      countries: 3,
      departments: 2,
    });
  });
});

describe('GET /api/insights/by-country', () => {
  it('reports local-currency pay ranges with USD medians and cost, largest country first', async () => {
    const res = await api.get('/api/insights/by-country');

    expect(res.body).toEqual([
      {
        country: 'United States',
        currency: 'USD',
        headcount: 4,
        min: 80_000,
        median: 110_000, // (100k + 120k) / 2
        average: 125_000,
        max: 200_000,
        medianUsd: 110_000,
        totalCostUsd: 500_000,
      },
      {
        country: 'India',
        currency: 'INR',
        headcount: 2,
        min: 4_150_000,
        median: 6_225_000,
        average: 6_225_000,
        max: 8_300_000,
        medianUsd: 75_000,
        totalCostUsd: 150_000,
      },
      {
        country: 'United Kingdom',
        currency: 'GBP',
        headcount: 1,
        min: 79_000,
        median: 79_000,
        average: 79_000,
        max: 79_000,
        medianUsd: 100_000,
        totalCostUsd: 100_000,
      },
    ]);
  });
});

describe('GET /api/insights/by-department', () => {
  it('compares departments in USD, most expensive first', async () => {
    const res = await api.get('/api/insights/by-department');

    expect(res.body).toEqual([
      // 100 + 120 + 200 + 100 + 50
      {
        department: 'Engineering',
        headcount: 5,
        totalCostUsd: 570_000,
        medianUsd: 100_000,
        averageUsd: 114_000,
      },
      // 80 + 100
      {
        department: 'Sales',
        headcount: 2,
        totalCostUsd: 180_000,
        medianUsd: 90_000,
        averageUsd: 90_000,
      },
    ]);
  });
});

describe('GET /api/insights/by-job-title', () => {
  it('compares titles across the org in USD', async () => {
    const res = await api.get('/api/insights/by-job-title');

    expect(res.body).toEqual({
      currency: 'USD',
      rows: [
        // USD 50, 100, 100, 120 -> median (100 + 100) / 2
        {
          jobTitle: 'Software Engineer',
          headcount: 4,
          min: 50_000,
          median: 100_000,
          average: 92_500,
          max: 120_000,
        },
        {
          jobTitle: 'Account Executive',
          headcount: 2,
          min: 80_000,
          median: 90_000,
          average: 90_000,
          max: 100_000,
        },
        {
          jobTitle: 'Staff Engineer',
          headcount: 1,
          min: 200_000,
          median: 200_000,
          average: 200_000,
          max: 200_000,
        },
      ],
    });
  });

  it('uses the local currency when narrowed to one country', async () => {
    const res = await api.get('/api/insights/by-job-title').query({ country: 'India' });

    expect(res.body).toEqual({
      currency: 'INR',
      rows: [
        {
          jobTitle: 'Software Engineer',
          headcount: 2,
          min: 4_150_000,
          median: 6_225_000,
          average: 6_225_000,
          max: 8_300_000,
        },
      ],
    });
  });

  it('rejects an unsupported country', async () => {
    expect(
      (await api.get('/api/insights/by-job-title').query({ country: 'Atlantis' })).status,
    ).toBe(400);
  });
});

describe('GET /api/insights/distribution', () => {
  it('buckets one country in its local currency', async () => {
    const res = await api.get('/api/insights/distribution').query({ country: 'United States' });

    // 80k..200k over ~20 buckets -> 10k wide; salaries 80k, 100k, 120k, 200k
    expect(res.body.currency).toBe('USD');
    expect(res.body.bucketWidth).toBe(10_000);
    expect(res.body.buckets).toHaveLength(13);
    expect(res.body.buckets.filter((b: { count: number }) => b.count > 0)).toEqual([
      { from: 80_000, to: 90_000, count: 1 },
      { from: 100_000, to: 110_000, count: 1 },
      { from: 120_000, to: 130_000, count: 1 },
      { from: 200_000, to: 210_000, count: 1 },
    ]);
  });

  it('buckets the whole org in USD', async () => {
    const res = await api.get('/api/insights/distribution');

    const total = res.body.buckets.reduce((sum: number, b: { count: number }) => sum + b.count, 0);
    expect(res.body.currency).toBe('USD');
    expect(total).toBe(7);
  });
});

describe('GET /api/insights/recent-changes', () => {
  it('lists the latest salary changes, newest first, excluding starting salaries', async () => {
    const change = (
      name: string,
      previousSalary: number,
      newSalary: number,
      date: string,
      reason: string,
    ) =>
      db.prisma.salaryRevision.create({
        data: {
          employeeId: ids[name]!,
          previousSalary,
          newSalary,
          currency: 'USD',
          effectiveDate: new Date(date),
          reason,
        },
      });
    await change('us1', 90_000, 100_000, '2026-03-01', 'Annual review');
    await change('us3', 160_000, 200_000, '2026-09-15', 'Promotion');

    const res = await api.get('/api/insights/recent-changes').query({ limit: 5 });

    expect(res.body).toEqual([
      expect.objectContaining({
        employeeId: ids.us3,
        fullName: 'us3',
        previousSalary: 160_000,
        newSalary: 200_000,
        currency: 'USD',
        changePercent: 25,
        effectiveDate: '2026-09-15',
        reason: 'Promotion',
      }),
      expect.objectContaining({ fullName: 'us1', changePercent: 11.1 }),
    ]);
  });

  it('caps the page size', async () => {
    expect((await api.get('/api/insights/recent-changes').query({ limit: 500 })).status).toBe(400);
  });
});
