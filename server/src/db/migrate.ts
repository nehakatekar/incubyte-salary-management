import { createPrismaClient } from './client.js';
import { applyMigrations } from './migrations.js';

/** Production migration step (`npm start`): works against Turso and local files alike. */
async function main() {
  const prisma = createPrismaClient();
  try {
    const applied = await applyMigrations(prisma);
    console.log(
      applied.length
        ? `Applied migrations: ${applied.join(', ')}`
        : 'Database schema is up to date',
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('Migration failed', error);
  process.exit(1);
});
