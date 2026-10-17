import { PrismaClient } from '@prisma/client';
import { generateEmployees } from './generate-employees.js';

const EMPLOYEE_COUNT = Number(process.env.SEED_COUNT ?? 10_000);
const SEED = 20_261_017;
const REFERENCE_DATE = new Date('2026-06-30T00:00:00Z');
const CHUNK_SIZE = 500;

async function main() {
  const prisma = new PrismaClient();
  const started = Date.now();

  const employees = generateEmployees({
    count: EMPLOYEE_COUNT,
    seed: SEED,
    referenceDate: REFERENCE_DATE,
  });
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
    { timeout: 120_000 },
  );

  console.log(
    `Seeded ${rows.length} employees and ${revisions.length} salary revisions in ${Date.now() - started} ms`,
  );
  await prisma.$disconnect();
}

function* chunks<T>(items: T[], size: number): Generator<T[]> {
  for (let i = 0; i < items.length; i += size) yield items.slice(i, i + size);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
