import {
  fakerDE,
  fakerEN,
  fakerEN_AU,
  fakerEN_CA,
  fakerEN_GB,
  fakerEN_IN,
  fakerEN_US,
  fakerNL,
  type Faker,
} from '@faker-js/faker';
import { currencyForCountry } from '../domain/countries.js';
import { fromUsd } from '../domain/fx.js';
import { COUNTRY_PROFILES, DEPARTMENT_WEIGHTS, DEPARTMENTS } from './reference-data.js';

export interface SeedRevision {
  previousSalary: number | null;
  newSalary: number;
  effectiveDate: Date;
  reason: string;
}

export interface SeedEmployee {
  employeeCode: string;
  fullName: string;
  email: string;
  jobTitle: string;
  department: string;
  country: string;
  employmentType: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT';
  hireDate: Date;
  status: 'ACTIVE' | 'TERMINATED';
  salary: number;
  currency: string;
  salaryEffectiveDate: Date;
  revisions: SeedRevision[];
}

export interface GenerateOptions {
  count: number;
  seed: number;
  /** "Today" for the generated data set; nothing is dated after it. */
  referenceDate: Date;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const EARLIEST_HIRE = new Date('2012-01-01T00:00:00Z');
const TERMINATION_RATE = 0.04;
const RAISE_REASONS = ['Annual review', 'Promotion', 'Market adjustment'] as const;

/** Name generators per country, so names look plausible for where people work. */
const NAME_FAKERS: Readonly<Record<string, Faker>> = {
  'United States': fakerEN_US,
  India: fakerEN_IN,
  'United Kingdom': fakerEN_GB,
  Germany: fakerDE,
  Canada: fakerEN_CA,
  Netherlands: fakerNL,
  Australia: fakerEN_AU,
  Singapore: fakerEN,
};

/**
 * Generates a realistic, fully deterministic organisation. The same options
 * always produce the same employees, which keeps the seed and tests stable.
 */
export function generateEmployees({ count, seed, referenceDate }: GenerateOptions): SeedEmployee[] {
  const random = fakerEN;
  random.seed(seed);
  Object.values(NAME_FAKERS).forEach((f, i) => f.seed(seed + i + 1));

  const countries = weighted(COUNTRY_PROFILES, (p) => p.weight);
  const departments = weighted(DEPARTMENT_WEIGHTS, (w) => w);

  return Array.from({ length: count }, (_, index) => {
    const country = random.helpers.weightedArrayElement(countries);
    const department = random.helpers.weightedArrayElement(departments);
    const job = random.helpers.weightedArrayElement(
      DEPARTMENTS[department]!.map((t) => ({ value: t, weight: t.weight })),
    );
    const currency = currencyForCountry(country)!;

    const nameFaker = NAME_FAKERS[country]!;
    const firstName = nameFaker.person.firstName();
    const lastName = nameFaker.person.lastName();

    const hireDate = startOfDay(random.date.between({ from: EARLIEST_HIRE, to: referenceDate }));
    const startingUsd =
      job.baseUsd *
      COUNTRY_PROFILES[country]!.payFactor *
      random.number.float({ min: 0.85, max: 1.2 });
    const revisions = buildRevisions(
      random,
      roundSalary(fromUsd(startingUsd, currency)),
      hireDate,
      referenceDate,
    );
    const current = revisions.at(-1)!;

    return {
      employeeCode: `EMP${String(index + 1).padStart(5, '0')}`,
      fullName: `${firstName} ${lastName}`,
      email: `${slug(firstName)}.${slug(lastName)}.${index + 1}@acme.com`,
      jobTitle: job.title,
      department,
      country,
      employmentType: random.helpers.weightedArrayElement([
        { value: 'FULL_TIME' as const, weight: 90 },
        { value: 'PART_TIME' as const, weight: 5 },
        { value: 'CONTRACT' as const, weight: 5 },
      ]),
      hireDate,
      status: random.number.float() < TERMINATION_RATE ? 'TERMINATED' : 'ACTIVE',
      salary: current.newSalary,
      currency,
      salaryEffectiveDate: current.effectiveDate,
      revisions,
    };
  });
}

/** Initial salary at hire, followed by 0–2 raises for anyone with over a year of tenure. */
function buildRevisions(
  random: Faker,
  startingSalary: number,
  hireDate: Date,
  referenceDate: Date,
): SeedRevision[] {
  const revisions: SeedRevision[] = [
    {
      previousSalary: null,
      newSalary: startingSalary,
      effectiveDate: hireDate,
      reason: 'Initial salary',
    },
  ];

  const firstEligibleDay = Math.floor(hireDate.getTime() / DAY_MS) + 365;
  const lastDay = Math.floor(referenceDate.getTime() / DAY_MS);
  if (firstEligibleDay > lastDay) return revisions;

  const raiseCount = random.helpers.weightedArrayElement([
    { value: 0, weight: 50 },
    { value: 1, weight: 35 },
    { value: 2, weight: 15 },
  ]);
  const raiseDays = random.helpers
    .uniqueArray(() => random.number.int({ min: firstEligibleDay, max: lastDay }), raiseCount)
    .sort((a, b) => a - b);

  for (const day of raiseDays) {
    const previous = revisions.at(-1)!.newSalary;
    revisions.push({
      previousSalary: previous,
      newSalary: roundSalary(previous * (1 + random.number.float({ min: 0.03, max: 0.12 }))),
      effectiveDate: new Date(day * DAY_MS),
      reason: random.helpers.arrayElement(RAISE_REASONS),
    });
  }
  return revisions;
}

function weighted<T>(table: Readonly<Record<string, T>>, weightOf: (v: T) => number) {
  return Object.entries(table).map(([value, v]) => ({ value, weight: weightOf(v) }));
}

/** Annual salaries are agreed in round numbers. */
function roundSalary(amount: number): number {
  return Math.max(100, Math.round(amount / 100) * 100);
}

function startOfDay(date: Date): Date {
  return new Date(Math.floor(date.getTime() / DAY_MS) * DAY_MS);
}

/** Lower-case ASCII for email local parts, e.g. "Jürgen O'Neil" -> "jurgenoneil". */
function slug(value: string): string {
  return (
    value
      .normalize('NFD')
      .replace(/ß/g, 'ss')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '') || 'employee'
  );
}
