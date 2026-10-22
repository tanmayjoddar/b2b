import { z } from 'zod';
import { BriefStatus } from '../enums/index.js';

export const CreateBriefSchema = z
  .object({
    verticalId: z.string().min(1, 'Vertical is required'),
    productName: z.string().min(2, 'Product name is required').max(120).trim(),
    quantityUnits: z.number().int().positive().max(10_000_000),
    targetPricePaiseMin: z.number().int().nonnegative().optional(),
    targetPricePaiseMax: z.number().int().nonnegative().optional(),
    requirementsJson: z.record(z.unknown()).default({}),
    timelineWeeks: z.number().int().positive().max(52),
  })
  .strict();

export type CreateBriefDto = z.infer<typeof CreateBriefSchema>;

export const UpdateBriefSchema = CreateBriefSchema.partial().strict();
export type UpdateBriefDto = z.infer<typeof UpdateBriefSchema>;

export const SubmitBriefSchema = z
  .object({
    id: z.string().min(1),
  })
  .strict();

export type SubmitBriefDto = z.infer<typeof SubmitBriefSchema>;

export const BriefResponseSchema = z.object({
  id: z.string(),
  brandId: z.string(),
  verticalId: z.string(),
  productName: z.string(),
  quantityUnits: z.number(),
  targetPricePaiseMin: z.number().nullable(),
  targetPricePaiseMax: z.number().nullable(),
  requirementsJson: z.record(z.unknown()),
  timelineWeeks: z.number(),
  status: z.nativeEnum(BriefStatus),
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()),
});

export type BriefResponse = z.infer<typeof BriefResponseSchema>;

/** Admin creates a shortlist against a brief */
export const CreateShortlistSchema = z
  .object({
    briefId: z.string().min(1),
    factoryIds: z
      .array(z.string().min(1))
      .min(1, 'At least 1 factory required')
      .max(5, 'Maximum 5 factories per shortlist'),
    notes: z.record(z.string(), z.string().max(500)).optional(),
  })
  .strict();

export type CreateShortlistDto = z.infer<typeof CreateShortlistSchema>;
