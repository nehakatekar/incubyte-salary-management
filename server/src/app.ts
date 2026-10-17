import express, { type Express } from 'express';

/**
 * Builds the Express app without binding a port, so tests can drive it
 * in-process with Supertest.
 */
export function createApp(): Express {
  const app = express();

  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  return app;
}
