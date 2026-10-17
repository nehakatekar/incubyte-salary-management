import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { createTestDb, type TestDb } from '../helpers/test-db.js';
import { insertEmployee } from '../helpers/fixtures.js';

let db: TestDb;
let api: ReturnType<typeof request>;

beforeAll(async () => {
  db = await createTestDb();
  api = request(createApp({ prisma: db.prisma }));
});
beforeEach(() => db.reset());
afterAll(() => db.destroy());

const list = (query: Record<string, string | number> = {}) =>
  api.get('/api/employees').query(query);
const names = (res: request.Response) => res.body.data.map((e: { fullName: string }) => e.fullName);

describe('GET /api/employees', () => {
  describe('pagination', () => {
    beforeEach(async () => {
      for (const name of ['Erin', 'Bob', 'Dana', 'Alice', 'Carl']) {
        await insertEmployee(db.prisma, { fullName: name });
      }
    });

    it('returns the first page sorted by name with paging metadata', async () => {
      const res = await list();

      expect(res.status).toBe(200);
      expect(names(res)).toEqual(['Alice', 'Bob', 'Carl', 'Dana', 'Erin']);
      expect(res.body).toMatchObject({ page: 1, pageSize: 25, total: 5, totalPages: 1 });
    });

    it('returns the requested page', async () => {
      const res = await list({ page: 2, pageSize: 2 });

      expect(names(res)).toEqual(['Carl', 'Dana']);
      expect(res.body).toMatchObject({ page: 2, pageSize: 2, total: 5, totalPages: 3 });
    });

    it('returns an empty page past the end rather than an error', async () => {
      const res = await list({ page: 9, pageSize: 2 });

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.total).toBe(5);
    });

    it.each([
      [{ pageSize: 101 }, 'pageSize'],
      [{ pageSize: 0 }, 'pageSize'],
      [{ page: 0 }, 'page'],
      [{ page: 'two' }, 'page'],
    ])('rejects invalid paging %o', async (query, field) => {
      const res = await list(query);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details[0].path).toBe(field);
    });

    it('does not include salary history in list rows', async () => {
      const res = await list({ pageSize: 1 });

      expect(res.body.data[0]).not.toHaveProperty('revisions');
      expect(res.body.data[0]).toMatchObject({ salary: 100_000, currency: 'USD' });
    });
  });

  describe('search', () => {
    beforeEach(async () => {
      await insertEmployee(db.prisma, { fullName: 'Priya Sharma', email: 'priya.sharma@acme.com' });
      await insertEmployee(db.prisma, { fullName: 'John Smith', email: 'jsmith@acme.com' });
      await insertEmployee(db.prisma, { fullName: 'Anna Schmidt', email: 'anna.s@acme.com' });
    });

    it('matches part of the name, case-insensitively', async () => {
      expect(names(await list({ search: 'SHAR' }))).toEqual(['Priya Sharma']);
    });

    it('matches part of the email', async () => {
      expect(names(await list({ search: 'jsmith' }))).toEqual(['John Smith']);
    });

    it('matches the employee code', async () => {
      const [first] = await db.prisma.employee.findMany({ where: { fullName: 'Anna Schmidt' } });

      expect(names(await list({ search: first!.employeeCode }))).toEqual(['Anna Schmidt']);
    });

    it('ignores surrounding whitespace and treats a blank search as no search', async () => {
      expect(names(await list({ search: '  smith ' }))).toEqual(['John Smith']);
      expect(names(await list({ search: '   ' }))).toHaveLength(3);
    });
  });

  describe('filters', () => {
    beforeEach(async () => {
      await insertEmployee(db.prisma, {
        fullName: 'A',
        country: 'India',
        department: 'Engineering',
      });
      await insertEmployee(db.prisma, {
        fullName: 'B',
        country: 'India',
        department: 'Sales',
        jobTitle: 'Account Executive',
      });
      await insertEmployee(db.prisma, {
        fullName: 'C',
        country: 'Germany',
        department: 'Engineering',
      });
      await insertEmployee(db.prisma, {
        fullName: 'D',
        country: 'India',
        department: 'Engineering',
        status: 'TERMINATED',
      });
    });

    it('filters by country', async () => {
      expect(names(await list({ country: 'India' }))).toEqual(['A', 'B', 'D']);
    });

    it('filters by department and job title', async () => {
      expect(names(await list({ department: 'Sales' }))).toEqual(['B']);
      expect(names(await list({ jobTitle: 'Software Engineer' }))).toEqual(['A', 'C', 'D']);
    });

    it('filters by status', async () => {
      expect(names(await list({ status: 'TERMINATED' }))).toEqual(['D']);
    });

    it('combines filters and search with AND', async () => {
      const res = await list({ country: 'India', department: 'Engineering', status: 'ACTIVE' });

      expect(names(res)).toEqual(['A']);
      expect(res.body.total).toBe(1);
    });

    it('rejects an unknown status', async () => {
      expect((await list({ status: 'RETIRED' })).status).toBe(400);
    });
  });

  describe('sorting', () => {
    beforeEach(async () => {
      await insertEmployee(db.prisma, { fullName: 'Low', salary: 50_000 });
      await insertEmployee(db.prisma, { fullName: 'High', salary: 150_000 });
      await insertEmployee(db.prisma, { fullName: 'Mid', salary: 90_000 });
    });

    it('sorts by salary descending', async () => {
      expect(names(await list({ sortBy: 'salary', sortDir: 'desc' }))).toEqual([
        'High',
        'Mid',
        'Low',
      ]);
    });

    it('rejects sorting by a column that is not allowed', async () => {
      const res = await list({ sortBy: 'email' });

      expect(res.status).toBe(400);
      expect(res.body.error.details[0].path).toBe('sortBy');
    });
  });
});
