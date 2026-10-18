import { createPrismaClient } from '../db/client.js';
import { seedDatabase } from './seed-database.js';

/**
 * `npm run seed` replaces the data with the deterministic 10k data set.
 * `--if-empty` (used on deploy) only seeds a brand-new database.
 */
async function main() {
  const prisma = createPrismaClient();
  const started = Date.now();
  try {
    const result = await seedDatabase(prisma, {
      count: Number(process.env.SEED_COUNT ?? 10_000),
      seed: 20_261_017,
      referenceDate: new Date('2026-06-30T00:00:00Z'),
      onlyIfEmpty: process.argv.includes('--if-empty'),
    });
    console.log(
      result.skipped
        ? 'Database already has employees; seed skipped'
        : `Seeded ${result.employees} employees and ${result.revisions} salary revisions in ${Date.now() - started} ms`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('Seed failed', error);
  process.exit(1);
});
