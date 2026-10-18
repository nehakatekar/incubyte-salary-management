import { Router } from 'express';
import { COUNTRIES } from '../domain/countries.js';
import { EMPLOYEE_STATUSES, EMPLOYMENT_TYPES } from '../domain/employee.js';
import type { EmployeeRepository } from '../repositories/employee.repository.js';

export function metaRouter(employees: EmployeeRepository): Router {
  const router = Router();

  router.get('/filters', async (_req, res) => {
    res.json({
      ...(await employees.filterValues()),
      statuses: EMPLOYEE_STATUSES,
      employmentTypes: EMPLOYMENT_TYPES,
      // Every country an employee can be created in, even if nobody works there yet.
      supportedCountries: COUNTRIES,
    });
  });

  return router;
}
