import { Prisma, type PrismaClient } from '@prisma/client';
import { USD_RATES } from '../domain/fx.js';

/** `usd` converts with the static FX table; `local` keeps each employee's own currency. */
export type Unit = 'usd' | 'local';
export type GroupBy = 'country' | 'department' | 'jobTitle' | null;

export interface StatsRow {
  group: string;
  headcount: number;
  min: number;
  max: number;
  average: number;
  median: number;
  total: number;
}

export interface Scope {
  unit: Unit;
  /** Restrict to one country (its local currency is then a single currency). */
  country?: string;
}

/** Whitelisted grouping expressions; never interpolate user input here. */
const GROUP_EXPRESSIONS: Record<Exclude<GroupBy, null>, Prisma.Sql> = {
  country: Prisma.raw('e.country'),
  department: Prisma.raw('e.department'),
  jobTitle: Prisma.raw('e.jobTitle'),
};

/**
 * Pay analytics over active employees. Everything is aggregated in SQLite;
 * no query loads individual salaries into the application.
 */
export class InsightsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /** Headcount, min/max/average/median and total per group, in one pass. */
  async salaryStats(groupBy: GroupBy, scope: Scope): Promise<StatsRow[]> {
    const group = groupBy ? GROUP_EXPRESSIONS[groupBy] : Prisma.sql`'all'`;
    const rows = await this.prisma.$queryRaw<RawStatsRow[]>`
      WITH ${baseCtes(group, scope)},
      ranked AS (
        SELECT grp, amount,
               ROW_NUMBER() OVER (PARTITION BY grp ORDER BY amount) AS rn,
               COUNT(*)     OVER (PARTITION BY grp)                 AS cnt
        FROM base
      )
      SELECT grp,
             COUNT(*)    AS headcount,
             MIN(amount) AS min,
             MAX(amount) AS max,
             AVG(amount) AS average,
             SUM(amount) AS total,
             -- The middle row (odd count) or the mean of the two middle rows (even count).
             AVG(CASE WHEN rn IN ((cnt + 1) / 2, (cnt + 2) / 2) THEN amount END) AS median
      FROM ranked
      GROUP BY grp`;

    return rows.map((row) => ({
      group: row.grp,
      headcount: Number(row.headcount),
      min: Number(row.min),
      max: Number(row.max),
      average: Number(row.average),
      median: Number(row.median),
      total: Number(row.total),
    }));
  }

  async salaryRange(scope: Scope): Promise<{ min: number | null; max: number | null }> {
    const [row] = await this.prisma.$queryRaw<{ min: number | null; max: number | null }[]>`
      WITH ${baseCtes(Prisma.sql`'all'`, scope)}
      SELECT MIN(amount) AS min, MAX(amount) AS max FROM base`;
    return { min: row?.min ?? null, max: row?.max ?? null };
  }

  /** Employee count per bucket index, where index = floor(amount / width). */
  async bucketCounts(scope: Scope, width: number): Promise<Map<number, number>> {
    const rows = await this.prisma.$queryRaw<{ bucket: bigint; count: bigint }[]>`
      WITH ${baseCtes(Prisma.sql`'all'`, scope)}
      SELECT CAST(amount / ${width} AS INTEGER) AS bucket, COUNT(*) AS count
      FROM base
      GROUP BY bucket`;
    return new Map(rows.map((row) => [Number(row.bucket), Number(row.count)]));
  }

  async activeDimensions(): Promise<{ countries: number; departments: number }> {
    const [row] = await this.prisma.$queryRaw<{ countries: bigint; departments: bigint }[]>`
      SELECT COUNT(DISTINCT country) AS countries, COUNT(DISTINCT department) AS departments
      FROM Employee
      WHERE status = 'ACTIVE'`;
    return { countries: Number(row?.countries ?? 0), departments: Number(row?.departments ?? 0) };
  }

  recentChanges(limit: number) {
    return this.prisma.salaryRevision.findMany({
      where: { previousSalary: { not: null } },
      orderBy: [{ effectiveDate: 'desc' }, { id: 'desc' }],
      take: limit,
      include: {
        employee: {
          select: { id: true, employeeCode: true, fullName: true, jobTitle: true, country: true },
        },
      },
    });
  }
}

interface RawStatsRow {
  grp: string;
  headcount: bigint;
  min: number;
  max: number;
  average: number;
  median: number;
  total: number;
}

/**
 * `rates`: the static FX table as rows. `base`: one row per active employee
 * with its group key and salary in the requested unit (USD rounded to cents,
 * so 79,000 GBP is exactly 100,000.00 USD rather than 100,000.0000001).
 */
function baseCtes(group: Prisma.Sql, { unit, country }: Scope): Prisma.Sql {
  const rates = Prisma.join(
    Object.entries(USD_RATES).map(
      ([currency, rate]) => Prisma.sql`SELECT ${currency} AS currency, ${rate} AS rate`,
    ),
    ' UNION ALL ',
  );
  const amount =
    unit === 'usd' ? Prisma.sql`ROUND(e.salary * 1.0 / r.rate, 2)` : Prisma.sql`e.salary * 1.0`;
  const countryFilter = country ? Prisma.sql`AND e.country = ${country}` : Prisma.empty;

  return Prisma.sql`
    rates AS (${rates}),
    base AS (
      SELECT ${group} AS grp, ${amount} AS amount
      FROM Employee e
      JOIN rates r ON r.currency = e.currency
      WHERE e.status = 'ACTIVE' ${countryFilter}
    )`;
}
