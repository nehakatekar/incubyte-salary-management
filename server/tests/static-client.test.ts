import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

let clientDir: string;
let api: ReturnType<typeof request>;

beforeAll(() => {
  // A stand-in for the built React app (client/dist).
  clientDir = mkdtempSync(join(tmpdir(), 'acme-client-'));
  mkdirSync(join(clientDir, 'assets'));
  writeFileSync(join(clientDir, 'index.html'), '<!doctype html><div id="root"></div>');
  writeFileSync(join(clientDir, 'assets', 'index-abc123.js'), 'console.log("app")');
  api = request(createApp({ prisma: undefined as never, clientDir }));
});
afterAll(() => rmSync(clientDir, { recursive: true, force: true }));

describe('serving the built client', () => {
  it('serves the app at the root', async () => {
    const res = await api.get('/');

    expect(res.status).toBe(200);
    expect(res.text).toContain('<div id="root">');
  });

  it('serves the app for client-side routes, so links and refreshes work', async () => {
    const res = await api.get('/employees/42');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/html/);
    expect(res.headers['cache-control']).toBe('no-cache');
  });

  it('serves hashed assets with a long-lived cache', async () => {
    const res = await api.get('/assets/index-abc123.js');

    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('public, max-age=31536000, immutable');
  });

  it('still answers unknown API routes with the JSON 404, not the app', async () => {
    const res = await api.get('/api/nope');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 404 for a missing asset instead of the app page', async () => {
    expect((await api.get('/assets/missing.js')).status).toBe(404);
  });
});
