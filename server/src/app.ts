import { join } from 'node:path';
import type { PrismaClient } from '@prisma/client';
import express, { type Express } from 'express';
import { systemClock, type Clock } from './domain/clock.js';
import { errorHandler, notFoundHandler } from './http/error-handler.js';
import { EmployeeRepository } from './repositories/employee.repository.js';
import { InsightsRepository } from './repositories/insights.repository.js';
import { employeesRouter } from './routes/employees.routes.js';
import { insightsRouter } from './routes/insights.routes.js';
import { metaRouter } from './routes/meta.routes.js';
import { EmployeeService } from './services/employee.service.js';
import { InsightsService } from './services/insights.service.js';
import { SalaryService } from './services/salary.service.js';

export interface AppDependencies {
  prisma: PrismaClient;
  clock?: Clock;
  /** Folder of the built React app; when given, the API also serves the client. */
  clientDir?: string;
}

/**
 * Builds the Express app without binding a port, so tests can drive it
 * in-process with Supertest against their own database and clock.
 */
export function createApp({ prisma, clock = systemClock, clientDir }: AppDependencies): Express {
  const employeeRepository = new EmployeeRepository(prisma);
  const employeeService = new EmployeeService(employeeRepository);
  const salaryService = new SalaryService(employeeRepository, clock);
  const insightsService = new InsightsService(new InsightsRepository(prisma));

  const app = express();
  app.disable('x-powered-by');
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });
  app.use('/api/employees', employeesRouter(employeeService, salaryService));
  app.use('/api/meta', metaRouter(employeeRepository));
  app.use('/api/insights', insightsRouter(insightsService));

  app.use('/api', notFoundHandler);
  if (clientDir) serveClient(app, clientDir);
  app.use(errorHandler);

  return app;
}

/**
 * One deployable: the API also serves the built client. Hashed assets are cached
 * for a year; every other GET returns index.html so client-side routes such as
 * /employees/42 survive a refresh, and the page itself is always revalidated.
 */
function serveClient(app: Express, clientDir: string) {
  app.use('/assets', express.static(join(clientDir, 'assets'), { immutable: true, maxAge: '1y' }));
  // A missing asset is a real 404, not a reason to serve the app page.
  app.use('/assets', (_req, res) => {
    res.status(404).end();
  });
  app.use(express.static(clientDir, { index: false }));
  app.get(/.*/, (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(join(clientDir, 'index.html'));
  });
}
