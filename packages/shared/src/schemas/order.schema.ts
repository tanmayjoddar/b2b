import { z } from 'zod';
import { OrderStatus, SampleStatus } from '../enums/index.js';

/* ─── State machine: allowed transitions (source of truth) ─── */

export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.CONFIRMED]: [OrderStatus.SAMPLE_APPROVED, OrderStatus.CANCELLED],
  [OrderStatus.SAMPLE_APPROVED]: [OrderStatus.ADVANCE_PAID, OrderStatus.CANCELLED],
  [OrderStatus.ADVANCE_PAID]: [OrderStatus.IN_PRODUCTION, OrderStatus.CANCELLED, OrderStatus.DISPUTED],
  [OrderStatus.IN_PRODUCTION]: [OrderStatus.READY, OrderStatus.CANCELLED, OrderStatus.DISPUTED],
  [OrderStatus.READY]: [OrderStatus.INSPECTED, OrderStatus.SHIPPED, OrderStatus.DISPUTED],
  [OrderStatus.INSPECTED]: [OrderStatus.SHIPPED, OrderStatus.DISPUTED],
  [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED, OrderStatus.DISPUTED],
  [OrderStatus.DELIVERED]: [OrderStatus.COMPLETED, OrderStatus.DISPUTED],
  [OrderStatus.COMPLETED]: [],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.DISPUTED]: [OrderStatus.IN_PRODUCTION, OrderStatus.CANCELLED],
};

export const SAMPLE_TRANSITIONS: Record<SampleStatus, SampleStatus[]> = {
  [SampleStatus.REQUESTED]: [SampleStatus.DISPATCHED],
  [SampleStatus.DISPATCHED]: [SampleStatus.RECEIVED],
  [SampleStatus.RECEIVED]: [SampleStatus.APPROVED, SampleStatus.REJECTED],
  [SampleStatus.APPROVED]: [],
  [SampleStatus.REJECTED]: [],
};

/* ─── Order DTOs ─── */

export const CreateOrderSchema = z
  .object({
    quoteId: z.string().min(1, 'Quote ID is required'),
    quantityUnits: z.number().int().positive(),
  })
  .strict();

export type CreateOrderDto = z.infer<typeof CreateOrderSchema>;

export const TransitionOrderSchema = z
  .object({
    toStatus: z.nativeEnum(OrderStatus),
    reason: z.string().max(500).optional(),
  })
  .strict();

export type TransitionOrderDto = z.infer<typeof TransitionOrderSchema>;

export const OrderResponseSchema = z.object({
  id: z.string(),
  brandId: z.string(),
  factoryId: z.string(),
  quoteId: z.string(),
  status: z.nativeEnum(OrderStatus),
  totalPaise: z.number(),
  quantityUnits: z.number(),
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()),
});

export type OrderResponse = z.infer<typeof OrderResponseSchema>;

export const OrderEventSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  fromStatus: z.nativeEnum(OrderStatus),
  toStatus: z.nativeEnum(OrderStatus),
  actorUserId: z.string(),
  reason: z.string().nullable(),
  createdAt: z.date().or(z.string()),
});

export type OrderEventResponse = z.infer<typeof OrderEventSchema>;

/* ─── Sample DTOs ─── */

export const CreateSampleSchema = z
  .object({
    briefId: z.string().min(1),
    factoryId: z.string().min(1),
  })
  .strict();

export type CreateSampleDto = z.infer<typeof CreateSampleSchema>;

export const TransitionSampleSchema = z
  .object({
    toStatus: z.nativeEnum(SampleStatus),
    trackingRef: z.string().max(200).optional(),
    brandFeedback: z.string().max(2000).optional(),
  })
  .strict();

export type TransitionSampleDto = z.infer<typeof TransitionSampleSchema>;
