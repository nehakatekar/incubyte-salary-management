import { Router } from 'express';
import type { InsightsService } from '../services/insights.service.js';
import { countryScopeQuery, recentChangesQuery } from '../validation/insights.schemas.js';

export function insightsRouter(insights: InsightsService): Router {
  const router = Router();

  router.get('/summary', async (_req, res) => {
    res.json(await insights.summary());
  });

  router.get('/by-country', async (_req, res) => {
    res.json(await insights.byCountry());
  });

  router.get('/by-department', async (_req, res) => {
    res.json(await insights.byDepartment());
  });

  router.get('/by-job-title', async (req, res) => {
    const { country } = countryScopeQuery.parse(req.query);
    res.json(await insights.byJobTitle(country));
  });

  router.get('/distribution', async (req, res) => {
    const { country } = countryScopeQuery.parse(req.query);
    res.json(await insights.distribution(country));
  });

  router.get('/recent-changes', async (req, res) => {
    const { limit } = recentChangesQuery.parse(req.query);
    res.json(await insights.recentChanges(limit));
  });

  return router;
}
