import type { PrismaClient } from '@prisma/client';
import { generateEmployees } from './generate-employees.js';

const CHUNK_SIZE = 500;

export interface SeedOptions {
  count: number;
  seed: number;
  referenceDate: Date;
  /** Skip when employees already exist, so a restart never wipes HR's changes. */
  onlyIfEmpty?: boolean;
}

export type SeedResult =
  { skipped: true } | { skipped: false; employees: number; revisions: number };

/** Replaces all employees and revisions with the deterministic generated data set. */
export async function seedDatabase(
  prisma: PrismaClient,
  options: SeedOptions,
): Promise<SeedResult> {
  if (options.onlyIfEmpty && (await prisma.employee.count()) > 0) return { skipped: true };

  const employees = generateEmployees(options);
  // Explicit ids let revisions reference their employee without a read-back.
  const rows = employees.map(({ revisions: _revisions, ...employee }, i) => ({
    id: i + 1,
    ...employee,
  }));
  const revisions = employees.flatMap((e, i) =>
    e.revisions.map((r) => ({ ...r, employeeId: i + 1, currency: e.currency })),
  );

  await prisma.$transaction(
    async (tx) => {
      await tx.salaryRevision.deleteMany();
      await tx.employee.deleteMany();
      for (const chunk of chunks(rows, CHUNK_SIZE)) await tx.employee.createMany({ data: chunk });
      for (const chunk of chunks(revisions, CHUNK_SIZE))
        await tx.salaryRevision.createMany({ data: chunk });
    },
    // Generous, because the deployed database is reached over the network.
    { timeout: 300_000, maxWait: 30_000 },
  );
  return { skipped: false, employees: rows.length, revisions: revisions.length };
}

function* chunks<T>(items: T[], size: number): Generator<T[]> {
  for (let i = 0; i < items.length; i += size) yield items.slice(i, i + size);
}
