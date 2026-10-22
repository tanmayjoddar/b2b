import { z } from 'zod';
import { PaymentMilestone, PaymentStatus } from '../enums/index.js';

export const CreatePaymentSchema = z
  .object({
    orderId: z.string().min(1),
    milestone: z.nativeEnum(PaymentMilestone),
    amountPaise: z.number().int().positive('Amount must be positive (in paise)'),
    idempotencyKey: z.string().min(8, 'Idempotency key is required (min 8 chars)').max(100),
  })
  .strict();

export type CreatePaymentDto = z.infer<typeof CreatePaymentSchema>;

export const PaymentResponseSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  milestone: z.nativeEnum(PaymentMilestone),
  amountPaise: z.number(),
  status: z.nativeEnum(PaymentStatus),
  razorpayOrderId: z.string(),
  razorpayPaymentId: z.string().nullable(),
  idempotencyKey: z.string(),
  createdAt: z.date().or(z.string()),
});

export type PaymentResponse = z.infer<typeof PaymentResponseSchema>;

/**
 * Razorpay webhook payload verification schema.
 * We validate the minimal envelope; actual fields come from Razorpay docs.
 */
export const RazorpayWebhookSchema = z.object({
  entity: z.literal('event'),
  event: z.string().min(1),
  payload: z.object({
    payment: z.object({
      entity: z.object({
        id: z.string(),
        order_id: z.string(),
        amount: z.number().int().positive(),
        currency: z.literal('INR'),
        status: z.string(),
        method: z.string().optional(),
      }),
    }).optional(),
    order: z.object({
      entity: z.object({
        id: z.string(),
        amount: z.number().int().positive(),
        status: z.string(),
      }),
    }).optional(),
  }),
  created_at: z.number(),
});

export type RazorpayWebhookPayload = z.infer<typeof RazorpayWebhookSchema>;

/**
 * Razorpay payment signature verification inputs.
 * Server-side: verify the payment signature to confirm legitimacy.
 */
export const VerifyPaymentSignatureSchema = z
  .object({
    razorpay_order_id: z.string().min(1),
    razorpay_payment_id: z.string().min(1),
    razorpay_signature: z.string().min(1),
  })
  .strict();

export type VerifyPaymentSignatureDto = z.infer<typeof VerifyPaymentSignatureSchema>;
