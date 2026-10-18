import { PrismaLibSQL } from '@prisma/adapter-libsql';
import { PrismaClient } from '@prisma/client';

export interface DatabaseEnv {
  TURSO_DATABASE_URL?: string;
  TURSO_AUTH_TOKEN?: string;
}

export type DatabaseTarget =
  { kind: 'libsql'; url: string; authToken: string | undefined } | { kind: 'prisma-file' };

/**
 * Turso (hosted SQLite, reached through the libSQL adapter) when its URL is set;
 * otherwise Prisma's own SQLite connection to the file in DATABASE_URL. Local
 * development and tests use the file; the deployed app uses Turso (ADR-010).
 */
export function databaseTarget(env: DatabaseEnv): DatabaseTarget {
  const url = env.TURSO_DATABASE_URL?.trim();
  if (!url) return { kind: 'prisma-file' };

  const authToken = env.TURSO_AUTH_TOKEN?.trim() || undefined;
  if (!url.startsWith('file:') && !authToken) {
    throw new Error('TURSO_AUTH_TOKEN is required when TURSO_DATABASE_URL points at Turso');
  }
  return { kind: 'libsql', url, authToken };
}

export function createPrismaClient(env: DatabaseEnv = process.env): PrismaClient {
  const target = databaseTarget(env);
  if (target.kind === 'prisma-file') return new PrismaClient();
  return new PrismaClient({
    adapter: new PrismaLibSQL({ url: target.url, authToken: target.authToken }),
  });
}
