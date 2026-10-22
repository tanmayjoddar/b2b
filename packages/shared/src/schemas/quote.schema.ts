import { z } from 'zod';
import { QuoteStatus } from '../enums/index.js';

/** Admin sends quote requests to shortlisted factories */
export const CreateQuoteRequestSchema = z
  .object({
    briefId: z.string().min(1),
    factoryId: z.string().min(1),
    expiresAt: z.string().datetime(),
  })
  .strict();

export type CreateQuoteRequestDto = z.infer<typeof CreateQuoteRequestSchema>;

/** Factory submits a quote against a quote request */
export const SubmitQuoteSchema = z
  .object({
    quoteRequestId: z.string().min(1),
    pricePaisePerUnit: z.number().int().positive('Price per unit must be positive (in paise)'),
    moqUnits: z.number().int().positive('MOQ must be positive'),
    leadTimeDays: z.number().int().positive().max(365),
    validUntil: z.string().datetime(),
    termsJson: z.record(z.unknown()).default({}),
  })
  .strict();

export type SubmitQuoteDto = z.infer<typeof SubmitQuoteSchema>;

export const QuoteResponseSchema = z.object({
  id: z.string(),
  quoteRequestId: z.string(),
  factoryId: z.string(),
  factoryName: z.string(),
  factoryCity: z.string(),
  factoryTier: z.string(),
  pricePaisePerUnit: z.number(),
  moqUnits: z.number(),
  leadTimeDays: z.number(),
  validUntil: z.date().or(z.string()),
  termsJson: z.record(z.unknown()),
  status: z.nativeEnum(QuoteStatus),
  createdAt: z.date().or(z.string()),
});

export type QuoteResponse = z.infer<typeof QuoteResponseSchema>;

/** Brand accepts or rejects a quote */
export const QuoteDecisionSchema = z
  .object({
    quoteId: z.string().min(1),
    decision: z.enum(['ACCEPTED', 'REJECTED']),
    reason: z.string().max(500).optional(),
  })
  .strict();

export type QuoteDecisionDto = z.infer<typeof QuoteDecisionSchema>;

export const QuoteComparisonSchema = z.object({
  briefId: z.string(),
  briefProductName: z.string(),
  quotes: z.array(QuoteResponseSchema),
});

export type QuoteComparison = z.infer<typeof QuoteComparisonSchema>;
