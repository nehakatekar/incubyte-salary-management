import { describe, expect, it } from 'vitest';
import { databaseTarget } from '../../src/db/client.js';

describe('databaseTarget', () => {
  it('uses Turso when its URL is configured', () => {
    expect(
      databaseTarget({ TURSO_DATABASE_URL: 'libsql://acme.turso.io', TURSO_AUTH_TOKEN: 'secret' }),
    ).toEqual({ kind: 'libsql', url: 'libsql://acme.turso.io', authToken: 'secret' });
  });

  it('falls back to the local SQLite file from DATABASE_URL otherwise', () => {
    expect(databaseTarget({})).toEqual({ kind: 'prisma-file' });
    expect(databaseTarget({ TURSO_DATABASE_URL: '  ' })).toEqual({ kind: 'prisma-file' });
  });

  it('refuses a remote Turso URL without a token, instead of failing on the first query', () => {
    expect(() => databaseTarget({ TURSO_DATABASE_URL: 'libsql://acme.turso.io' })).toThrow(
      'TURSO_AUTH_TOKEN',
    );
  });

  it('allows a local libSQL file without a token (used to test the adapter path)', () => {
    expect(databaseTarget({ TURSO_DATABASE_URL: 'file:./local.db' })).toEqual({
      kind: 'libsql',
      url: 'file:./local.db',
      authToken: undefined,
    });
  });
});
