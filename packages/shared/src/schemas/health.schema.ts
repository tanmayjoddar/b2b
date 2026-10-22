import { z } from 'zod';

export const HealthResponseSchema = z
  .object({
    status: z.enum(['ok', 'error']),
    timestamp: z.string().datetime(),
    service: z.string(),
    version: z.string(),
    uptimeSeconds: z.number().nonnegative(),
    details: z
      .object({
        database: z.enum(['connected', 'disconnected', 'skipped']),
      })
      .optional(),
  })
  .strict();

export type HealthResponse = z.infer<typeof HealthResponseSchema>;
