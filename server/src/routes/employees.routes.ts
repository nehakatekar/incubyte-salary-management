import { Router } from 'express';
import { toEmployeeDetailDto, toEmployeeDto } from '../http/dto.js';
import type { EmployeeService } from '../services/employee.service.js';
import { idParam } from '../validation/common.js';
import {
  createEmployeeBody,
  listEmployeesQuery,
  updateEmployeeBody,
} from '../validation/employee.schemas.js';

export function employeesRouter(service: EmployeeService): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    const page = await service.list(listEmployeesQuery.parse(req.query));
    res.json({ ...page, data: page.data.map(toEmployeeDto) });
  });

  router.get('/:id', async (req, res) => {
    const { id } = idParam.parse(req.params);
    res.json(toEmployeeDetailDto(await service.get(id)));
  });

  router.post('/', async (req, res) => {
    const employee = await service.create(createEmployeeBody.parse(req.body));
    res.status(201).json(toEmployeeDto(employee));
  });

  router.patch('/:id', async (req, res) => {
    const { id } = idParam.parse(req.params);
    res.json(toEmployeeDto(await service.update(id, updateEmployeeBody.parse(req.body))));
  });

  router.delete('/:id', async (req, res) => {
    const { id } = idParam.parse(req.params);
    res.json(toEmployeeDto(await service.terminate(id)));
  });

  return router;
}
