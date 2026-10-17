import { PrismaClient } from '@prisma/client';
import { createApp } from './app.js';

const port = Number(process.env.PORT ?? 3000);
const prisma = new PrismaClient();

const server = createApp({ prisma }).listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});

function shutdown() {
  server.close(() => void prisma.$disconnect().then(() => process.exit(0)));
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
