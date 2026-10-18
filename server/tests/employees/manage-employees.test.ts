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

const newEmployee = {
  fullName: 'Meera Iyer',
  email: 'Meera.Iyer@acme.com',
  jobTitle: 'Product Manager',
  department: 'Product',
  country: 'India',
  employmentType: 'FULL_TIME',
  hireDate: '2026-07-01',
  salary: 3_200_000,
};

describe('POST /api/employees', () => {
  it('creates an employee with a generated code and the country currency', async () => {
    const res = await api.post('/api/employees').send(newEmployee);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      fullName: 'Meera Iyer',
      email: 'meera.iyer@acme.com',
      country: 'India',
      currency: 'INR',
      salary: 3_200_000,
      status: 'ACTIVE',
      hireDate: '2026-07-01',
      salaryEffectiveDate: '2026-07-01',
    });
    expect(res.body.employeeCode).toMatch(/^EMP\d{5}$/);
  });

  it('records the starting salary as the first revision', async () => {
    const { body } = await api.post('/api/employees').send(newEmployee);

    const detail = await api.get(`/api/employees/${body.id}`);

    expect(detail.body.revisions).toEqual([
      expect.objectContaining({
        previousSalary: null,
        newSalary: 3_200_000,
        currency: 'INR',
        effectiveDate: '2026-07-01',
        reason: 'Initial salary',
      }),
    ]);
  });

  it.each([
    ['a missing name', { fullName: undefined }, 'fullName'],
    ['an invalid email', { email: 'not-an-email' }, 'email'],
    ['an unsupported country', { country: 'Atlantis' }, 'country'],
    ['a zero salary', { salary: 0 }, 'salary'],
    ['a fractional salary', { salary: 1000.5 }, 'salary'],
    ['an invalid hire date', { hireDate: '2026-02-30' }, 'hireDate'],
    ['an unknown employment type', { employmentType: 'INTERN' }, 'employmentType'],
  ])('rejects %s', async (_case, override, field) => {
    const res = await api.post('/api/employees').send({ ...newEmployee, ...override });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.map((d: { path: string }) => d.path)).toContain(field);
  });

  it('rejects a duplicate email regardless of case', async () => {
    await insertEmployee(db.prisma, { email: 'meera.iyer@acme.com' });

    const res = await api.post('/api/employees').send(newEmployee);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });
});

describe('GET /api/employees/:id', () => {
  it('returns the employee with salary history, newest first', async () => {
    const employee = await insertEmployee(db.prisma, { salary: 100_000, hireDate: '2020-01-15' });
    await db.prisma.salaryRevision.create({
      data: {
        employeeId: employee.id,
        previousSalary: 100_000,
        newSalary: 110_000,
        currency: 'USD',
        effectiveDate: new Date('2021-04-01'),
        reason: 'Annual review',
      },
    });

    const res = await api.get(`/api/employees/${employee.id}`);

    expect(res.status).toBe(200);
    expect(res.body.revisions.map((r: { reason: string }) => r.reason)).toEqual([
      'Annual review',
      'Initial salary',
    ]);
  });

  it('returns 404 for an unknown employee', async () => {
    const res = await api.get('/api/employees/999');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 400 for a malformed id', async () => {
    expect((await api.get('/api/employees/abc')).status).toBe(400);
  });
});

describe('PATCH /api/employees/:id', () => {
  it('updates editable fields', async () => {
    const employee = await insertEmployee(db.prisma);

    const res = await api
      .patch(`/api/employees/${employee.id}`)
      .send({ jobTitle: 'Senior Software Engineer', department: 'Engineering' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      jobTitle: 'Senior Software Engineer',
      salary: employee.salary,
    });
  });

  it.each([['salary'], ['country'], ['status'], ['currency']])(
    'refuses to change %s through a general edit',
    async (field) => {
      const employee = await insertEmployee(db.prisma);

      const res = await api.patch(`/api/employees/${employee.id}`).send({ [field]: 'x' });

      expect(res.status).toBe(400);
    },
  );

  it('rejects an empty update', async () => {
    const employee = await insertEmployee(db.prisma);

    expect((await api.patch(`/api/employees/${employee.id}`).send({})).status).toBe(400);
  });

  it('rejects an email that belongs to someone else', async () => {
    await insertEmployee(db.prisma, { email: 'taken@acme.com' });
    const employee = await insertEmployee(db.prisma);

    const res = await api.patch(`/api/employees/${employee.id}`).send({ email: 'taken@acme.com' });

    expect(res.status).toBe(409);
  });

  it('returns 404 for an unknown employee', async () => {
    expect((await api.patch('/api/employees/999').send({ jobTitle: 'X' })).status).toBe(404);
  });
});

describe('DELETE /api/employees/:id', () => {
  it('terminates the employee but keeps their record and history', async () => {
    const employee = await insertEmployee(db.prisma);

    const res = await api.delete(`/api/employees/${employee.id}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('TERMINATED');
    const detail = await api.get(`/api/employees/${employee.id}`);
    expect(detail.body).toMatchObject({ status: 'TERMINATED' });
    expect(detail.body.revisions).toHaveLength(1);
  });

  it('returns 404 for an unknown employee', async () => {
    expect((await api.delete('/api/employees/999')).status).toBe(404);
  });
});

describe('GET /api/meta/filters', () => {
  it('returns the distinct, sorted values used by list filters', async () => {
    await insertEmployee(db.prisma, {
      country: 'India',
      department: 'Sales',
      jobTitle: 'Account Executive',
    });
    await insertEmployee(db.prisma, { country: 'Germany', department: 'Engineering' });
    await insertEmployee(db.prisma, { country: 'India', department: 'Engineering' });

    const res = await api.get('/api/meta/filters');

    expect(res.body).toEqual({
      countries: ['Germany', 'India'],
      departments: ['Engineering', 'Sales'],
      jobTitles: ['Account Executive', 'Software Engineer'],
      statuses: ['ACTIVE', 'TERMINATED'],
      employmentTypes: ['FULL_TIME', 'PART_TIME', 'CONTRACT'],
      supportedCountries: expect.arrayContaining([{ name: 'India', currency: 'INR' }]),
    });
  });
});

describe('error handling', () => {
  it('returns a consistent 404 for unknown API routes', async () => {
    const res = await api.get('/api/nope');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
  });

  it('returns 400 for malformed JSON', async () => {
    const res = await api
      .post('/api/employees')
      .set('Content-Type', 'application/json')
      .send('{"fullName":');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_JSON');
  });
});
