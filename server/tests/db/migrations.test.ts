import { randomUUID } from 'node:crypto';
import { rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createPrismaClient } from '../../src/db/client.js';
import { applyMigrations, readMigrations } from '../../src/db/migrations.js';

const files: string[] = [];
afterEach(() => {
  for (const file of files.splice(0)) {
    // On Windows the libSQL driver keeps the file locked until the process exits;
    // a leftover temp file is harmless, so cleanup is best-effort.
    try {
      rmSync(file, { force: true });
    } catch {
      /* still locked */
    }
  }
});

/** A fresh database reached through the libSQL adapter, as in production. */
function freshLibsqlClient() {
  const file = join(tmpdir(), `acme-migrate-${randomUUID()}.db`);
  files.push(file);
  return createPrismaClient({ TURSO_DATABASE_URL: `file:${file}` });
}

describe('readMigrations', () => {
  it('returns every migration in order, split into statements', () => {
    const migrations = readMigrations();

    expect(migrations.map((m) => m.name)).toEqual([...migrations.map((m) => m.name)].sort());
    expect(migrations[0]?.statements.some((s) => s.startsWith('CREATE TABLE "Employee"'))).toBe(
      true,
    );
  });
});

describe('applyMigrations', () => {
  it('creates the schema on an empty database and records what it applied', async () => {
    const prisma = freshLibsqlClient();

    const applied = await applyMigrations(prisma);

    expect(applied).toEqual(readMigrations().map((m) => m.name));
    expect(await prisma.employee.count()).toBe(0);
    await prisma.$disconnect();
  });

  it('does nothing when run again', async () => {
    const prisma = freshLibsqlClient();
    await applyMigrations(prisma);

    expect(await applyMigrations(prisma)).toEqual([]);
    await prisma.$disconnect();
  });

  it('treats migrations already applied by `prisma migrate` as done', async () => {
    const prisma = freshLibsqlClient();
    await applyMigrations(prisma);
    // Simulate a database created by `prisma migrate deploy` instead.
    await prisma.$executeRawUnsafe('DROP TABLE "_applied_migrations"');
    await prisma.$executeRawUnsafe(
      'CREATE TABLE "_prisma_migrations" ("migration_name" TEXT, "finished_at" DATETIME)',
    );
    for (const { name } of readMigrations()) {
      await prisma.$executeRawUnsafe(
        'INSERT INTO "_prisma_migrations" VALUES (?, CURRENT_TIMESTAMP)',
        name,
      );
    }

    expect(await applyMigrations(prisma)).toEqual([]);
    await prisma.$disconnect();
  });
});
