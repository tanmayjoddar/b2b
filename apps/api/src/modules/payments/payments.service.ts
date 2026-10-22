import { Injectable, Logger } from '@nestjs/common';
import {
  AuthUser,
  CreatePaymentDto,
  CURRENCY,
  PaymentMilestone,
  PaymentStatus,
  RazorpayWebhookPayload,
  RazorpayWebhookSchema,
  VerifyPaymentSignatureDto,
} from '@factorymatch/shared';
import { PaymentsRepository } from './payments.repository.js';
import { RazorpayClient } from '../../infra/razorpay/razorpay.client.js';
import {
  canCreatePayment,
  canViewOrderPayments,
  canViewPayment,
} from './payments.policy.js';
import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '../../common/errors/app-error.js';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly repo: PaymentsRepository,
    private readonly razorpayClient: RazorpayClient,
  ) {}

  /**
   * Creates a payment for an order milestone.
   * Security rules:
   * 1. Validates order exists and user owns it (returns 404 for unauthorized).
   * 2. Checks idempotency: if payment with same idempotencyKey exists, returns existing payment.
   * 3. Checks unique constraint: prevents duplicate payments for the same (orderId, milestone).
   * 4. Amounts ALWAYS come from the database (order.totalPaise / quote), NEVER from the client request.
   * 5. Creates Razorpay order server-side and saves payment record.
   */
  async createPayment(user: AuthUser, dto: CreatePaymentDto) {
    // 1. Check idempotency: if payment with same key exists, return it (don't create duplicate)
    const existingByIdempotency = await this.repo.findByIdempotencyKey(dto.idempotencyKey);
    if (existingByIdempotency) {
      if (
        existingByIdempotency.orderId !== dto.orderId ||
        existingByIdempotency.milestone !== dto.milestone
      ) {
        throw new ConflictError('Idempotency key has already been used for a different payment');
      }
      return existingByIdempotency;
    }

    // 2. Validate order exists
    const order = await this.repo.findOrderById(dto.orderId);
    if (!order) {
      throw new NotFoundError('Order not found');
    }

    // 3. Authorization check: only brand who owns the order, or admin (404 to avoid leaking existence)
    if (!canCreatePayment(user, order)) {
      throw new NotFoundError('Order not found');
    }

    // 4. Check unique constraint: one payment per (orderId, milestone)
    const existingMilestonePayment = await this.repo.findByOrderAndMilestone(
      dto.orderId,
      dto.milestone,
    );
    if (existingMilestonePayment) {
      throw new ConflictError(
        `Payment for milestone ${dto.milestone} already exists for this order`,
      );
    }

    // 5. Amount comes STRICTLY from the database (order.totalPaise / quote terms), NEVER from client
    const amountPaise = this.calculateMilestoneAmount(order, dto.milestone);

    // 6. Create Razorpay order server-side
    const razorpayOrderId = await this.razorpayClient.createRazorpayOrder(
      amountPaise,
      CURRENCY,
      order.id,
    );

    // 7. Save payment record in DB
    try {
      return await this.repo.create(
        dto.orderId,
        dto.milestone,
        amountPaise,
        razorpayOrderId,
        dto.idempotencyKey,
      );
    } catch (err: any) {
      // Handle unique constraint race condition gracefully
      if (err?.code === 'P2002') {
        const raceExisting = await this.repo.findByIdempotencyKey(dto.idempotencyKey);
        if (raceExisting) {
          return raceExisting;
        }
        throw new ConflictError(`Payment for milestone ${dto.milestone} already exists`);
      }
      throw err;
    }
  }

  /**
   * Verifies Razorpay payment signature server-side and marks payment CAPTURED.
   */
  async verifyPayment(user: AuthUser, dto: VerifyPaymentSignatureDto) {
    const payment = await this.repo.findByRazorpayOrderId(dto.razorpay_order_id);
    if (!payment) {
      throw new NotFoundError('Payment not found');
    }

    // Authorization check
    if (!canViewPayment(user, payment, payment.order)) {
      throw new NotFoundError('Payment not found');
    }

    // Verify signature using crypto HMAC SHA256 with timingSafeEqual
    const isValid = this.razorpayClient.verifyPaymentSignature(
      dto.razorpay_order_id,
      dto.razorpay_payment_id,
      dto.razorpay_signature,
    );

    if (!isValid) {
      throw new ValidationError('Invalid payment signature');
    }

    // If already captured, return existing payment (idempotent verification)
    if (payment.status === PaymentStatus.CAPTURED) {
      return payment;
    }

    // Transition payment to CAPTURED
    return this.repo.updateStatus(
      payment.id,
      PaymentStatus.CAPTURED,
      dto.razorpay_payment_id,
    );
  }

  /**
   * Razorpay webhook handler.
   * Security rules:
   * 1. Verifies webhook signature using raw body bytes and crypto.timingSafeEqual.
   * 2. Deduplicates by event / payment id: already-captured payments are not double-applied.
   * 3. Responds 200 quickly.
   */
  async handleWebhook(rawBody: string | Buffer, signature: string) {
    // 1. Verify webhook signature
    const isValid = this.razorpayClient.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      throw new UnauthorizedError('Invalid webhook signature');
    }

    // 2. Parse and validate webhook payload
    let parsed: unknown;
    try {
      const rawString = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : rawBody;
      parsed = JSON.parse(rawString);
    } catch {
      throw new ValidationError('Invalid JSON webhook body');
    }

    const validation = RazorpayWebhookSchema.safeParse(parsed);
    if (!validation.success) {
      this.logger.warn('Unrecognized webhook payload structure');
      return { received: true, status: 'unrecognized_payload' };
    }

    const payload: RazorpayWebhookPayload = validation.data;

    // 3. Process payment.captured events
    if (payload.event === 'payment.captured') {
      const paymentEntity = payload.payload.payment?.entity;
      const razorpayOrderId = paymentEntity?.order_id;
      const razorpayPaymentId = paymentEntity?.id;

      if (razorpayOrderId) {
        const payment = await this.repo.findByRazorpayOrderId(razorpayOrderId);
        if (payment) {
          // Deduplication: if already CAPTURED, do not double-apply
          if (payment.status === PaymentStatus.CAPTURED) {
            this.logger.log(`Duplicate webhook for already captured payment ${payment.id}`);
            return { received: true, status: 'already_captured' };
          }

          // Update status to CAPTURED
          await this.repo.updateStatus(
            payment.id,
            PaymentStatus.CAPTURED,
            razorpayPaymentId,
          );
          this.logger.log(`Payment ${payment.id} captured via webhook`);
          return { received: true, status: 'captured' };
        }
      }
    }

    return { received: true, status: 'processed' };
  }

  /**
   * Lists payments for an order.
   * Verifies user has access to view the order payments.
   */
  async getPaymentsForOrder(user: AuthUser, orderId: string) {
    const order = await this.repo.findOrderById(orderId);
    if (!order) {
      throw new NotFoundError('Order not found');
    }

    if (!canViewOrderPayments(user, order)) {
      throw new NotFoundError('Order not found');
    }

    return this.repo.findByOrderId(orderId);
  }

  /**
   * Get single payment by ID.
   */
  async getPaymentById(user: AuthUser, id: string) {
    const payment = await this.repo.findById(id);
    if (!payment) {
      throw new NotFoundError('Payment not found');
    }

    if (!canViewPayment(user, payment, payment.order)) {
      throw new NotFoundError('Payment not found');
    }

    return payment;
  }

  /**
   * Calculates the milestone amount from the database order / quote records.
   * Client-provided amounts are NEVER used.
   */
  private calculateMilestoneAmount(
    order: {
      totalPaise: number;
      quote?: {
        termsJson?: unknown;
      } | null;
    },
    milestone: PaymentMilestone,
  ): number {
    const terms = (order.quote?.termsJson || {}) as Record<string, any>;

    if (milestone === PaymentMilestone.ADVANCE) {
      if (typeof terms.advancePaise === 'number' && terms.advancePaise > 0) {
        return terms.advancePaise;
      }
      if (typeof terms.advancePercentage === 'number' && terms.advancePercentage > 0) {
        return Math.round((order.totalPaise * terms.advancePercentage) / 100);
      }
    } else if (milestone === PaymentMilestone.BALANCE) {
      if (typeof terms.balancePaise === 'number' && terms.balancePaise > 0) {
        return terms.balancePaise;
      }
      if (typeof terms.balancePercentage === 'number' && terms.balancePercentage > 0) {
        return Math.round((order.totalPaise * terms.balancePercentage) / 100);
      }
    } else if (milestone === PaymentMilestone.INSPECTION) {
      if (typeof terms.inspectionPaise === 'number' && terms.inspectionPaise > 0) {
        return terms.inspectionPaise;
      }
      if (typeof terms.inspectionPercentage === 'number' && terms.inspectionPercentage > 0) {
        return Math.round((order.totalPaise * terms.inspectionPercentage) / 100);
      }
    }

    // Default to total order paise from DB
    return order.totalPaise;
  }
}
