import { randomUUID } from 'node:crypto';
import { rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { readMigrations } from '../../src/db/migrations.js';

/** Every migration statement, in order, read once per test run. */
const MIGRATION_STATEMENTS = readMigrations().flatMap((migration) => migration.statements);

export interface TestDb {
  prisma: PrismaClient;
  /** Removes all rows so each test starts from a known state. */
  reset(): Promise<void>;
  destroy(): Promise<void>;
}

/**
 * Creates an isolated SQLite database file with the real schema applied.
 * Faster than shelling out to `prisma migrate` and never touches dev data.
 */
export async function createTestDb(): Promise<TestDb> {
  const file = join(tmpdir(), `acme-test-${randomUUID()}.db`);
  const prisma = new PrismaClient({ datasourceUrl: `file:${file}` });

  for (const statement of MIGRATION_STATEMENTS) {
    await prisma.$executeRawUnsafe(statement);
  }

  return {
    prisma,
    async reset() {
      await prisma.salaryRevision.deleteMany();
      await prisma.employee.deleteMany();
    },
    async destroy() {
      await prisma.$disconnect();
      rmSync(file, { force: true });
    },
  };
}
