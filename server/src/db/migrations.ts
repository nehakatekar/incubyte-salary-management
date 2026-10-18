import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PrismaClient } from '@prisma/client';

const MIGRATIONS_DIR = join(import.meta.dirname, '../../prisma/migrations');
const LEDGER = '_applied_migrations';

export interface Migration {
  name: string;
  statements: string[];
}

/** Every migration folder in order, with its SQL split into statements. */
export function readMigrations(dir = MIGRATIONS_DIR): Migration[] {
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .map((name) => ({
      name,
      statements: readFileSync(join(dir, name, 'migration.sql'), 'utf8')
        .split(';')
        .map((sql) => sql.replace(/^\s*--.*$/gm, '').trim())
        .filter(Boolean),
    }));
}

/**
 * Applies pending migrations and records each in a ledger table. `prisma migrate
 * deploy` cannot talk to Turso, so production runs this instead. Each migration
 * is applied atomically, and running it again is a no-op.
 *
 * @returns the names of the migrations applied by this run
 */
export async function applyMigrations(prisma: PrismaClient): Promise<string[]> {
  await prisma.$executeRawUnsafe(
    `CREATE TABLE IF NOT EXISTS "${LEDGER}" ("name" TEXT PRIMARY KEY, "applied_at" TEXT NOT NULL)`,
  );
  const done = new Set([...(await ledgerNames(prisma)), ...(await prismaMigrateNames(prisma))]);

  const applied: string[] = [];
  for (const migration of readMigrations()) {
    if (done.has(migration.name)) continue;
    await prisma.$transaction([
      ...migration.statements.map((sql) => prisma.$executeRawUnsafe(sql)),
      prisma.$executeRawUnsafe(
        `INSERT INTO "${LEDGER}" ("name", "applied_at") VALUES (?, ?)`,
        migration.name,
        new Date().toISOString(),
      ),
    ]);
    applied.push(migration.name);
  }
  return applied;
}

async function ledgerNames(prisma: PrismaClient): Promise<string[]> {
  const rows = await prisma.$queryRawUnsafe<{ name: string }[]>(`SELECT "name" FROM "${LEDGER}"`);
  return rows.map((row) => row.name);
}

/** Migrations already applied by `prisma migrate` (e.g. on a local dev database). */
async function prismaMigrateNames(prisma: PrismaClient): Promise<string[]> {
  const [table] = await prisma.$queryRawUnsafe<{ name: string }[]>(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name = '_prisma_migrations'`,
  );
  if (!table) return [];
  const rows = await prisma.$queryRawUnsafe<{ migration_name: string }[]>(
    `SELECT "migration_name" FROM "_prisma_migrations" WHERE "finished_at" IS NOT NULL`,
  );
  return rows.map((row) => row.migration_name);
}
