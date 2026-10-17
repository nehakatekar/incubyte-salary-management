import { z } from 'zod';
import { isoDate } from './common.js';
import { salary } from './employee.schemas.js';

export const changeSalaryBody = z.strictObject({
  salary,
  effectiveDate: isoDate,
  reason: z.string().trim().min(1, 'Reason is required').max(200),
});
export type ChangeSalaryInput = z.infer<typeof changeSalaryBody>;
