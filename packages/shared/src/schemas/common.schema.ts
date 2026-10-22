import { z } from 'zod';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../constants/index.js';

/**
 * Money must strictly be represented as integer paise. Never floats.
 * 1 INR = 100 paise.
 */
export const MoneyPaiseSchema = z
  .number()
  .int({ message: 'Amount must be an integer (in paise)' })
  .nonnegative({ message: 'Amount cannot be negative' });

export const PositiveMoneyPaiseSchema = z
  .number()
  .int({ message: 'Amount must be an integer (in paise)' })
  .positive({ message: 'Amount must be greater than zero' });

export const PaginationQuerySchema = z
  .object({
    cursor: z.string().optional(),
    limit: z
      .coerce
      .number()
      .int()
      .min(1)
      .max(MAX_PAGE_SIZE)
      .default(DEFAULT_PAGE_SIZE),
  })
  .strict();

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

export const IdParamSchema = z
  .object({
    id: z.string().min(1, 'ID is required'),
  })
  .strict();

export type IdParam = z.infer<typeof IdParamSchema>;

/**
 * Helper to convert paise to human readable INR string
 */
export function formatPaiseToINR(paise: number): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(rupees);
}

/**
 * Helper to convert rupees to paise
 */
export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}
