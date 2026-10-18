import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { seedDatabase } from '../../src/seed/seed-database.js';
import { insertEmployee } from '../helpers/fixtures.js';
import { createTestDb, type TestDb } from '../helpers/test-db.js';

let db: TestDb;
beforeAll(async () => {
  db = await createTestDb();
});
beforeEach(() => db.reset());
afterAll(() => db.destroy());

const options = { count: 20, seed: 1, referenceDate: new Date('2026-06-30T00:00:00Z') };

describe('seedDatabase', () => {
  it('loads the generated employees and their salary history', async () => {
    const result = await seedDatabase(db.prisma, options);

    if (result.skipped) throw new Error('expected the seed to run');
    expect(result.employees).toBe(20);
    expect(await db.prisma.employee.count()).toBe(20);
    expect(await db.prisma.salaryRevision.count()).toBe(result.revisions);
  });

  it('replaces existing data by default, so a re-seed starts clean', async () => {
    await insertEmployee(db.prisma, { fullName: 'Manual Hire' });

    await seedDatabase(db.prisma, options);

    expect(await db.prisma.employee.count()).toBe(20);
    expect(await db.prisma.employee.count({ where: { fullName: 'Manual Hire' } })).toBe(0);
  });

  it('leaves a database with employees untouched when asked to seed only if empty', async () => {
    await insertEmployee(db.prisma, { fullName: 'Manual Hire' });

    const result = await seedDatabase(db.prisma, { ...options, onlyIfEmpty: true });

    expect(result).toEqual({ skipped: true });
    expect(await db.prisma.employee.count()).toBe(1);
  });

  it('seeds an empty database when asked to seed only if empty', async () => {
    const result = await seedDatabase(db.prisma, { ...options, onlyIfEmpty: true });

    expect(result.skipped).toBe(false);
    expect(await db.prisma.employee.count()).toBe(20);
  });
});
