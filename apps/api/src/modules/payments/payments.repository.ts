import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { PaymentMilestone, PaymentStatus } from '@factorymatch/shared';

export interface CreatePaymentParams {
  orderId: string;
  milestone: PaymentMilestone;
  amountPaise: number;
  razorpayOrderId: string;
  idempotencyKey: string;
}

@Injectable()
export class PaymentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new payment record.
   * Accepts either an object or individual positional arguments.
   */
  async create(
    dataOrOrderId: CreatePaymentParams | string,
    milestone?: PaymentMilestone,
    amountPaise?: number,
    razorpayOrderId?: string,
    idempotencyKey?: string,
  ) {
    const data =
      typeof dataOrOrderId === 'object'
        ? dataOrOrderId
        : {
            orderId: dataOrOrderId,
            milestone: milestone!,
            amountPaise: amountPaise!,
            razorpayOrderId: razorpayOrderId!,
            idempotencyKey: idempotencyKey!,
          };

    return this.prisma.payment.create({
      data: {
        orderId: data.orderId,
        milestone: data.milestone,
        amountPaise: data.amountPaise,
        razorpayOrderId: data.razorpayOrderId,
        idempotencyKey: data.idempotencyKey,
        status: PaymentStatus.PENDING,
      },
    });
  }

  /**
   * Find payment by primary ID with order relation.
   */
  async findById(id: string) {
    return this.prisma.payment.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            brand: true,
            factory: true,
          },
        },
      },
    });
  }

  /**
   * Find all payments for a specific order.
   */
  async findByOrderId(orderId: string) {
    return this.prisma.payment.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find payment by idempotency key for deduplication.
   */
  async findByIdempotencyKey(key: string) {
    return this.prisma.payment.findUnique({
      where: { idempotencyKey: key },
      include: {
        order: {
          include: {
            brand: true,
            factory: true,
          },
        },
      },
    });
  }

  /**
   * Find payment by Razorpay order ID.
   */
  async findByRazorpayOrderId(razorpayOrderId: string) {
    return this.prisma.payment.findFirst({
      where: { razorpayOrderId },
      include: {
        order: {
          include: {
            brand: true,
            factory: true,
          },
        },
      },
    });
  }

  /**
   * Find payment by unique composite key (orderId, milestone).
   */
  async findByOrderAndMilestone(orderId: string, milestone: PaymentMilestone) {
    return this.prisma.payment.findUnique({
      where: {
        orderId_milestone: {
          orderId,
          milestone,
        },
      },
    });
  }

  /**
   * Update payment status and optional Razorpay payment ID.
   */
  async updateStatus(id: string, status: PaymentStatus, razorpayPaymentId?: string) {
    return this.prisma.payment.update({
      where: { id },
      data: {
        status,
        ...(razorpayPaymentId ? { razorpayPaymentId } : {}),
      },
    });
  }

  /**
   * Look up order by ID with associated brand, factory, and quote relations.
   */
  async findOrderById(orderId: string) {
    return this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        brand: true,
        factory: true,
        quote: true,
      },
    });
  }
}
