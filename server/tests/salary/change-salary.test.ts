import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { ConflictError } from '../../src/errors.js';
import { EmployeeRepository } from '../../src/repositories/employee.repository.js';
import { insertEmployee } from '../helpers/fixtures.js';
import { createTestDb, type TestDb } from '../helpers/test-db.js';

const TODAY = new Date('2026-10-17T09:00:00Z');

let db: TestDb;
let api: ReturnType<typeof request>;

beforeAll(async () => {
  db = await createTestDb();
  api = request(createApp({ prisma: db.prisma, clock: () => TODAY }));
});
beforeEach(() => db.reset());
afterAll(() => db.destroy());

const raise = { salary: 110_000, effectiveDate: '2026-10-01', reason: 'Annual review' };
const changeSalary = (id: number, body: object) =>
  api.post(`/api/employees/${id}/salary`).send(body);

describe('POST /api/employees/:id/salary', () => {
  it('updates the salary and returns the employee with the new revision on top', async () => {
    const employee = await insertEmployee(db.prisma, { salary: 100_000, hireDate: '2020-01-15' });

    const res = await changeSalary(employee.id, raise);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ salary: 110_000, salaryEffectiveDate: '2026-10-01' });
    expect(res.body.revisions[0]).toMatchObject({
      previousSalary: 100_000,
      newSalary: 110_000,
      currency: 'USD',
      effectiveDate: '2026-10-01',
      reason: 'Annual review',
    });
    expect(res.body.revisions).toHaveLength(2);
  });

  it('is reflected in the employee list', async () => {
    const employee = await insertEmployee(db.prisma, { salary: 100_000 });

    await changeSalary(employee.id, raise);

    const list = await api.get('/api/employees');
    expect(list.body.data[0].salary).toBe(110_000);
  });

  it('keeps the history in order across several changes', async () => {
    const employee = await insertEmployee(db.prisma, { salary: 100_000, hireDate: '2020-01-15' });

    await changeSalary(employee.id, { ...raise, salary: 105_000, effectiveDate: '2025-04-01' });
    const res = await changeSalary(employee.id, raise);

    expect(
      res.body.revisions.map((r: { previousSalary: number | null; newSalary: number }) => [
        r.previousSalary,
        r.newSalary,
      ]),
    ).toEqual([
      [105_000, 110_000],
      [100_000, 105_000],
      [null, 100_000],
    ]);
  });

  it.each([
    ['a missing reason', { reason: undefined }, 'reason'],
    ['a blank reason', { reason: '   ' }, 'reason'],
    ['a fractional salary', { salary: 100.5 }, 'salary'],
    ['a negative salary', { salary: -1 }, 'salary'],
    ['an invalid date', { effectiveDate: '2026-13-01' }, 'effectiveDate'],
    ['an unexpected field', { currency: 'EUR' }, ''],
  ])('rejects %s with 400', async (_case, override, field) => {
    const employee = await insertEmployee(db.prisma);

    const res = await changeSalary(employee.id, { ...raise, ...override });

    expect(res.status).toBe(400);
    expect(res.body.error.details.map((d: { path: string }) => d.path)).toContain(field);
  });

  it('rejects a business-rule violation with 422 and leaves the salary untouched', async () => {
    const employee = await insertEmployee(db.prisma, { salary: 100_000 });

    const res = await changeSalary(employee.id, { ...raise, effectiveDate: '2026-12-01' });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('BUSINESS_RULE_VIOLATION');
    const detail = await api.get(`/api/employees/${employee.id}`);
    expect(detail.body.salary).toBe(100_000);
    expect(detail.body.revisions).toHaveLength(1);
  });

  it('returns 404 for an unknown employee', async () => {
    expect((await changeSalary(999, raise)).status).toBe(404);
  });
});

describe('EmployeeRepository.recordSalaryChange', () => {
  it('refuses to overwrite a salary that changed since it was read', async () => {
    const employee = await insertEmployee(db.prisma, { salary: 100_000 });
    const repository = new EmployeeRepository(db.prisma);
    const staleRead = { salary: 95_000, salaryEffectiveDate: employee.salaryEffectiveDate };

    const result = repository.recordSalaryChange(employee.id, staleRead, {
      previousSalary: 95_000,
      newSalary: 120_000,
      currency: 'USD',
      effectiveDate: new Date('2026-10-01'),
      reason: 'Raise',
    });

    await expect(result).rejects.toThrow(ConflictError);
    expect(await db.prisma.salaryRevision.count()).toBe(1);
  });
});
