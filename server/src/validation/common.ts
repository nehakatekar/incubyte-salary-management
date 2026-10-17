import { z } from 'zod';

/** Calendar date in YYYY-MM-DD form, parsed to a UTC midnight Date. */
export const isoDate = z.iso.date().transform((value) => new Date(`${value}T00:00:00Z`));

export const idParam = z.object({ id: z.coerce.number().int().positive() });
