import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { createApp } from './app.js';
import { createPrismaClient } from './db/client.js';

const port = Number(process.env.PORT ?? 3000);
const SHUTDOWN_TIMEOUT_MS = 10_000;
// The built React app, served by the API in production (one deployable, one URL).
const CLIENT_DIR = join(import.meta.dirname, '../../client/dist');

const prisma = createPrismaClient();
const clientDir = existsSync(join(CLIENT_DIR, 'index.html')) ? CLIENT_DIR : undefined;

const server = createApp({ prisma, clientDir }).listen(port, () => {
  console.log(
    `Server listening on http://localhost:${port}${clientDir ? ' (serving the client build)' : ''}`,
  );
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
