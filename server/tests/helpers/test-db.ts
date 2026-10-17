import { randomUUID } from 'node:crypto';
import { readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';

const MIGRATIONS_DIR = join(import.meta.dirname, '../../prisma/migrations');

/** Every migration statement, in order, read once per test run. */
const MIGRATION_STATEMENTS = readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort()
  .flatMap((dir) => readFileSync(join(MIGRATIONS_DIR, dir, 'migration.sql'), 'utf8').split(';'))
  .map((sql) => sql.replace(/^\s*--.*$/gm, '').trim())
  .filter(Boolean);

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
