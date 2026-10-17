import { describe, expect, it } from 'vitest';
import { generateEmployees, type SeedEmployee } from '../../src/seed/generate-employees.js';
import { COUNTRIES } from '../../src/domain/countries.js';

const REFERENCE_DATE = new Date('2026-06-30T00:00:00Z');
const generate = (count: number, seed = 42) =>
  generateEmployees({ count, seed, referenceDate: REFERENCE_DATE });

describe('generateEmployees', () => {
  const employees = generate(2_000);

  it('generates the requested number of employees', () => {
    expect(employees).toHaveLength(2_000);
  });

  it('is deterministic for the same seed', () => {
    expect(generate(50, 7)).toEqual(generate(50, 7));
  });

  it('produces different data for a different seed', () => {
    expect(generate(50, 7)).not.toEqual(generate(50, 8));
  });

  it('assigns sequential, zero-padded employee codes', () => {
    expect(employees[0]?.employeeCode).toBe('EMP00001');
    expect(employees[1_999]?.employeeCode).toBe('EMP02000');
  });

  it('gives every employee a unique, ASCII-only email', () => {
    const emails = employees.map((e) => e.email);

    expect(new Set(emails).size).toBe(emails.length);
    for (const email of emails) {
      expect(email).toMatch(/^[a-z0-9.]+@acme\.com$/);
    }
  });

  it('spreads employees across every supported country', () => {
    const countries = new Set(employees.map((e) => e.country));

    expect([...countries].sort()).toEqual(COUNTRIES.map((c) => c.name).sort());
  });

  it('pays each employee in their country currency', () => {
    for (const e of employees) {
      expect(e.currency).toBe(COUNTRIES.find((c) => c.name === e.country)?.currency);
    }
  });

  it('gives every employee a positive whole-number salary', () => {
    for (const e of employees) {
      expect(Number.isInteger(e.salary)).toBe(true);
      expect(e.salary).toBeGreaterThan(0);
    }
  });

  it('pays more senior titles more, on average, within a country', () => {
    const avg = (title: string) => {
      const pay = employees
        .filter((e) => e.country === 'United States' && e.jobTitle === title)
        .map((e) => e.salary);
      return pay.reduce((a, b) => a + b, 0) / pay.length;
    };

    expect(avg('Senior Software Engineer')).toBeGreaterThan(avg('Software Engineer'));
  });

  it('hires everyone on or before the reference date', () => {
    for (const e of employees) {
      expect(e.hireDate.getTime()).toBeLessThanOrEqual(REFERENCE_DATE.getTime());
    }
  });

  it('marks a small minority of employees as terminated', () => {
    const terminated = employees.filter((e) => e.status === 'TERMINATED').length;

    expect(terminated / employees.length).toBeGreaterThan(0.01);
    expect(terminated / employees.length).toBeLessThan(0.1);
  });

  describe('salary revisions', () => {
    it('starts every history with an initial salary at the hire date', () => {
      for (const e of employees) {
        const [first] = e.revisions;
        expect(first).toMatchObject({ previousSalary: null, effectiveDate: e.hireDate });
      }
    });

    it('chains revisions so each previous salary matches the prior new salary', () => {
      for (const e of employees) {
        e.revisions.slice(1).forEach((rev, i) => {
          expect(rev.previousSalary).toBe(e.revisions[i]?.newSalary);
          expect(rev.effectiveDate.getTime()).toBeGreaterThan(
            e.revisions[i]!.effectiveDate.getTime(),
          );
        });
      }
    });

    it('ends every history at the current salary and effective date', () => {
      for (const e of employees) {
        const last = e.revisions.at(-1);
        expect(last?.newSalary).toBe(e.salary);
        expect(last?.effectiveDate).toEqual(e.salaryEffectiveDate);
      }
    });

    it('gives a meaningful share of employees at least one raise', () => {
      const withRaise = employees.filter((e: SeedEmployee) => e.revisions.length > 1).length;

      expect(withRaise / employees.length).toBeGreaterThan(0.2);
    });
  });
});
