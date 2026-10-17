import { Router } from 'express';
import { toEmployeeDetailDto, toEmployeeDto } from '../http/dto.js';
import type { EmployeeService } from '../services/employee.service.js';
import type { SalaryService } from '../services/salary.service.js';
import { idParam } from '../validation/common.js';
import {
  createEmployeeBody,
  listEmployeesQuery,
  updateEmployeeBody,
} from '../validation/employee.schemas.js';
import { changeSalaryBody } from '../validation/salary.schemas.js';

export function employeesRouter(employees: EmployeeService, salaries: SalaryService): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    const page = await employees.list(listEmployeesQuery.parse(req.query));
    res.json({ ...page, data: page.data.map(toEmployeeDto) });
  });

  router.get('/:id', async (req, res) => {
    const { id } = idParam.parse(req.params);
    res.json(toEmployeeDetailDto(await employees.get(id)));
  });

  router.post('/', async (req, res) => {
    const employee = await employees.create(createEmployeeBody.parse(req.body));
    res.status(201).json(toEmployeeDto(employee));
  });

  router.patch('/:id', async (req, res) => {
    const { id } = idParam.parse(req.params);
    res.json(toEmployeeDto(await employees.update(id, updateEmployeeBody.parse(req.body))));
  });

  router.delete('/:id', async (req, res) => {
    const { id } = idParam.parse(req.params);
    res.json(toEmployeeDto(await employees.terminate(id)));
  });

  router.post('/:id/salary', async (req, res) => {
    const { id } = idParam.parse(req.params);
    const employee = await salaries.changeSalary(id, changeSalaryBody.parse(req.body));
    res.status(201).json(toEmployeeDetailDto(employee));
  });

  return router;
}
