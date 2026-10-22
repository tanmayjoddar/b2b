import { z } from 'zod';

export const CreateReviewSchema = z
  .object({
    orderId: z.string().uuid(),
    onTimeRating: z.number().int().min(1).max(5),
    qualityRating: z.number().int().min(1).max(5),
    communicationRating: z.number().int().min(1).max(5),
    comment: z.string().max(1000).optional(),
  })
  .strict();

export type CreateReviewDto = z.infer<typeof CreateReviewSchema>;

export const ReviewResponseSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  brandId: z.string(),
  factoryId: z.string(),
  onTimeRating: z.number().int().min(1).max(5),
  qualityRating: z.number().int().min(1).max(5),
  communicationRating: z.number().int().min(1).max(5),
  comment: z.string().nullable().optional(),
  createdAt: z.date().or(z.string()),
});

export type ReviewResponse = z.infer<typeof ReviewResponseSchema>;

export const AuditLogQuerySchema = z.object({
  actorUserId: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export type AuditLogQueryDto = z.infer<typeof AuditLogQuerySchema>;
