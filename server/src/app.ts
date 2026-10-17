import type { PrismaClient } from '@prisma/client';
import express, { type Express } from 'express';
import { errorHandler, notFoundHandler } from './http/error-handler.js';
import { EmployeeRepository } from './repositories/employee.repository.js';
import { employeesRouter } from './routes/employees.routes.js';
import { metaRouter } from './routes/meta.routes.js';
import { EmployeeService } from './services/employee.service.js';

export interface AppDependencies {
  prisma: PrismaClient;
}

/**
 * Builds the Express app without binding a port, so tests can drive it
 * in-process with Supertest against their own database.
 */
export function createApp({ prisma }: AppDependencies): Express {
  const employeeRepository = new EmployeeRepository(prisma);
  const employeeService = new EmployeeService(employeeRepository);

  const app = express();
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });
  app.use('/api/employees', employeesRouter(employeeService));
  app.use('/api/meta', metaRouter(employeeRepository));

  app.use('/api', notFoundHandler);
  app.use(errorHandler);

  return app;
}
