import { z } from 'zod';
import { country } from './employee.schemas.js';

export const countryScopeQuery = z.object({ country: country.optional() });

export const recentChangesQuery = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
});
