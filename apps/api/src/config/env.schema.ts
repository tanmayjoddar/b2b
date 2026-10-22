import { z } from 'zod';

export const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  API_PREFIX: z.string().default('api/v1'),
  CORS_ORIGIN: z.string().default('http://localhost:3001'),
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/factorymatch?schema=public'),
  COOKIE_SECRET: z.string().min(16).default('development-cookie-secret-min-16-chars'),
  JWT_ACCESS_SECRET: z.string().min(16).default('development-jwt-access-secret-min-16-chars'),
  JWT_REFRESH_SECRET: z.string().min(16).default('development-jwt-refresh-secret-min-16-chars'),
  RAZORPAY_KEY_ID: z.string().default('rzp_test_placeholder'),
  RAZORPAY_KEY_SECRET: z.string().default('rzp_test_secret_placeholder'),
  RAZORPAY_WEBHOOK_SECRET: z.string().default('rzp_webhook_secret_placeholder'),
});

export type Env = z.infer<typeof EnvSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const result = EnvSchema.safeParse(config);
  if (!result.success) {
    const errors = result.error.format();
    throw new Error(`Environment validation failure: ${JSON.stringify(errors, null, 2)}`);
  }
  return result.data;
}
