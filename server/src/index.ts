import { PrismaClient } from '@prisma/client';
import { createApp } from './app.js';

const port = Number(process.env.PORT ?? 3000);
const SHUTDOWN_TIMEOUT_MS = 10_000;
const prisma = new PrismaClient();

const server = createApp({ prisma }).listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});

server.on('error', (error) => {
  console.error('Server failed to start', error);
  process.exit(1);
});

/** Stops accepting requests, lets in-flight ones finish, then closes the database. */
function shutdown(signal: string) {
  console.log(`${signal} received, shutting down`);
  // Keep-alive connections would otherwise hold the process open indefinitely.
  setTimeout(() => process.exit(1), SHUTDOWN_TIMEOUT_MS).unref();
  server.closeIdleConnections();
  server.close(() => void prisma.$disconnect().finally(() => process.exit(0)));
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
