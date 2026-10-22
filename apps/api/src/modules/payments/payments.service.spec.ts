import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  AuthUser,
  CreatePaymentDto,
  PaymentMilestone,
  PaymentStatus,
  Role,
  UserStatus,
  VerifyPaymentSignatureDto,
} from '@factorymatch/shared';
import { PaymentsService } from './payments.service.js';
import { PaymentsRepository } from './payments.repository.js';
import { RazorpayClient } from '../../infra/razorpay/razorpay.client.js';
import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '../../common/errors/app-error.js';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let mockRepo: any;
  let mockRazorpayClient: any;

  const brandUser: AuthUser = {
    id: 'usr-brand-1',
    email: 'brand@example.com',
    phone: '+919876543210',
    role: Role.BRAND,
    status: UserStatus.ACTIVE,
    brandId: 'brand-1',
  };

  const otherBrandUser: AuthUser = {
    id: 'usr-brand-2',
    email: 'otherbrand@example.com',
    phone: '+919876543211',
    role: Role.BRAND,
    status: UserStatus.ACTIVE,
    brandId: 'brand-2',
  };

  const factoryUser: AuthUser = {
    id: 'usr-fac-1',
    email: 'factory@example.com',
    phone: '+919876543212',
    role: Role.FACTORY,
    status: UserStatus.ACTIVE,
    factoryId: 'factory-1',
  };

  const mockOrder = {
    id: 'order-123',
    brandId: 'brand-1',
    factoryId: 'factory-1',
    quoteId: 'quote-123',
    totalPaise: 500000, // 5,000 INR
    quantityUnits: 1000,
    brand: { id: 'brand-1', userId: 'usr-brand-1' },
    factory: { id: 'factory-1', ownerUserId: 'usr-fac-1' },
    quote: { termsJson: {} },
  };

  const existingPayment = {
    id: 'pay-1',
    orderId: 'order-123',
    milestone: PaymentMilestone.ADVANCE,
    amountPaise: 500000,
    status: PaymentStatus.PENDING,
    razorpayOrderId: 'order_rzp_123',
    razorpayPaymentId: null,
    idempotencyKey: 'idemp-key-advance-123',
    createdAt: new Date(),
    updatedAt: new Date(),
    order: mockOrder,
  };

  beforeEach(() => {
    mockRepo = {
      create: vi.fn(),
      findById: vi.fn(),
      findByOrderId: vi.fn(),
      findByIdempotencyKey: vi.fn(),
      findByRazorpayOrderId: vi.fn(),
      findByOrderAndMilestone: vi.fn(),
      updateStatus: vi.fn(),
      findOrderById: vi.fn(),
    };

    mockRazorpayClient = {
      createRazorpayOrder: vi.fn(),
      verifyPaymentSignature: vi.fn(),
      verifyWebhookSignature: vi.fn(),
    };

    service = new PaymentsService(
      mockRepo as unknown as PaymentsRepository,
      mockRazorpayClient as unknown as RazorpayClient,
    );
  });

  describe('createPayment', () => {
    const dto: CreatePaymentDto = {
      orderId: 'order-123',
      milestone: PaymentMilestone.ADVANCE,
      amountPaise: 100, // Untrusted client-supplied amount
      idempotencyKey: 'idemp-key-advance-123',
    };

    it('Idempotent payment creation: same idempotency key returns existing payment without creating duplicate', async () => {
      mockRepo.findByIdempotencyKey.mockResolvedValue(existingPayment);

      const result = await service.createPayment(brandUser, dto);

      expect(result).toEqual(existingPayment);
      expect(mockRepo.findOrderById).not.toHaveBeenCalled();
      expect(mockRazorpayClient.createRazorpayOrder).not.toHaveBeenCalled();
      expect(mockRepo.create).not.toHaveBeenCalled();
    });

    it('Rejects idempotency key reuse for a different order or milestone with ConflictError', async () => {
      mockRepo.findByIdempotencyKey.mockResolvedValue({
        ...existingPayment,
        orderId: 'other-order',
      });

      await expect(service.createPayment(brandUser, dto)).rejects.toThrow(ConflictError);
    });

    it('Only order-owning brand can create payment: rejects other brand with NotFoundError (404)', async () => {
      mockRepo.findByIdempotencyKey.mockResolvedValue(null);
      mockRepo.findOrderById.mockResolvedValue(mockOrder);

      await expect(service.createPayment(otherBrandUser, dto)).rejects.toThrow(NotFoundError);
      expect(mockRazorpayClient.createRazorpayOrder).not.toHaveBeenCalled();
      expect(mockRepo.create).not.toHaveBeenCalled();
    });

    it('Only order-owning brand can create payment: rejects factory user with NotFoundError (404)', async () => {
      mockRepo.findByIdempotencyKey.mockResolvedValue(null);
      mockRepo.findOrderById.mockResolvedValue(mockOrder);

      await expect(service.createPayment(factoryUser, dto)).rejects.toThrow(NotFoundError);
      expect(mockRazorpayClient.createRazorpayOrder).not.toHaveBeenCalled();
    });

    it('Throws NotFoundError if order does not exist', async () => {
      mockRepo.findByIdempotencyKey.mockResolvedValue(null);
      mockRepo.findOrderById.mockResolvedValue(null);

      await expect(service.createPayment(brandUser, dto)).rejects.toThrow(NotFoundError);
    });

    it('Prevents double payment for same milestone: throws ConflictError if milestone payment exists', async () => {
      mockRepo.findByIdempotencyKey.mockResolvedValue(null);
      mockRepo.findOrderById.mockResolvedValue(mockOrder);
      mockRepo.findByOrderAndMilestone.mockResolvedValue(existingPayment);

      await expect(service.createPayment(brandUser, dto)).rejects.toThrow(ConflictError);
      expect(mockRazorpayClient.createRazorpayOrder).not.toHaveBeenCalled();
    });

    it('Amount comes from DB, not from client: uses order.totalPaise from DB ignoring client amountPaise', async () => {
      mockRepo.findByIdempotencyKey.mockResolvedValue(null);
      mockRepo.findOrderById.mockResolvedValue(mockOrder);
      mockRepo.findByOrderAndMilestone.mockResolvedValue(null);
      mockRazorpayClient.createRazorpayOrder.mockResolvedValue('order_rzp_new_999');
      mockRepo.create.mockResolvedValue({
        id: 'pay-new',
        orderId: 'order-123',
        milestone: PaymentMilestone.ADVANCE,
        amountPaise: 500000,
        status: PaymentStatus.PENDING,
        razorpayOrderId: 'order_rzp_new_999',
        idempotencyKey: dto.idempotencyKey,
      });

      const result = await service.createPayment(brandUser, {
        ...dto,
        amountPaise: 99, // Attempted client manipulation: 99 paise instead of 500,000 paise
      });

      // Verify Razorpay order was created with DB amount 500000 (NOT client's 99)
      expect(mockRazorpayClient.createRazorpayOrder).toHaveBeenCalledWith(
        500000,
        'INR',
        'order-123',
      );

      // Verify payment record in DB uses 500000 (NOT client's 99)
      expect(mockRepo.create).toHaveBeenCalledWith(
        'order-123',
        PaymentMilestone.ADVANCE,
        500000,
        'order_rzp_new_999',
        dto.idempotencyKey,
      );

      expect(result.amountPaise).toBe(500000);
      expect(result.amountPaise).not.toBe(99);
    });
  });

  describe('verifyPayment', () => {
    const verifyDto: VerifyPaymentSignatureDto = {
      razorpay_order_id: 'order_rzp_123',
      razorpay_payment_id: 'pay_rzp_payment_456',
      razorpay_signature: 'valid_signature_hash',
    };

    it('successfully verifies signature and updates status to CAPTURED', async () => {
      mockRepo.findByRazorpayOrderId.mockResolvedValue(existingPayment);
      mockRazorpayClient.verifyPaymentSignature.mockReturnValue(true);
      mockRepo.updateStatus.mockResolvedValue({
        ...existingPayment,
        status: PaymentStatus.CAPTURED,
        razorpayPaymentId: verifyDto.razorpay_payment_id,
      });

      const result = await service.verifyPayment(brandUser, verifyDto);

      expect(result.status).toBe(PaymentStatus.CAPTURED);
      expect(mockRepo.updateStatus).toHaveBeenCalledWith(
        existingPayment.id,
        PaymentStatus.CAPTURED,
        verifyDto.razorpay_payment_id,
      );
    });

    it('is idempotent when payment is already CAPTURED', async () => {
      const alreadyCaptured = {
        ...existingPayment,
        status: PaymentStatus.CAPTURED,
        razorpayPaymentId: verifyDto.razorpay_payment_id,
      };
      mockRepo.findByRazorpayOrderId.mockResolvedValue(alreadyCaptured);
      mockRazorpayClient.verifyPaymentSignature.mockReturnValue(true);

      const result = await service.verifyPayment(brandUser, verifyDto);

      expect(result.status).toBe(PaymentStatus.CAPTURED);
      expect(mockRepo.updateStatus).not.toHaveBeenCalled();
    });

    it('rejects invalid signature with ValidationError', async () => {
      mockRepo.findByRazorpayOrderId.mockResolvedValue(existingPayment);
      mockRazorpayClient.verifyPaymentSignature.mockReturnValue(false);

      await expect(service.verifyPayment(brandUser, verifyDto)).rejects.toThrow(ValidationError);
      expect(mockRepo.updateStatus).not.toHaveBeenCalled();
    });

    it('throws NotFoundError if payment record is not found', async () => {
      mockRepo.findByRazorpayOrderId.mockResolvedValue(null);

      await expect(service.verifyPayment(brandUser, verifyDto)).rejects.toThrow(NotFoundError);
    });
  });

  describe('handleWebhook', () => {
    const webhookPayload = {
      entity: 'event',
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_rzp_12345',
            order_id: 'order_rzp_123',
            amount: 500000,
            currency: 'INR',
            status: 'captured',
          },
        },
      },
      created_at: 1698000000,
    };
    const rawBody = JSON.stringify(webhookPayload);
    const validSignature = 'valid_hmac_sha256_webhook_signature';

    it('Invalid webhook signature is rejected with UnauthorizedError', async () => {
      mockRazorpayClient.verifyWebhookSignature.mockReturnValue(false);

      await expect(
        service.handleWebhook(rawBody, 'tampered_or_invalid_signature'),
      ).rejects.toThrow(UnauthorizedError);

      expect(mockRepo.findByRazorpayOrderId).not.toHaveBeenCalled();
      expect(mockRepo.updateStatus).not.toHaveBeenCalled();
    });

    it('Processes payment.captured webhook and updates payment status to CAPTURED', async () => {
      mockRazorpayClient.verifyWebhookSignature.mockReturnValue(true);
      mockRepo.findByRazorpayOrderId.mockResolvedValue(existingPayment);
      mockRepo.updateStatus.mockResolvedValue({
        ...existingPayment,
        status: PaymentStatus.CAPTURED,
      });

      const result = await service.handleWebhook(rawBody, validSignature);

      expect(result.received).toBe(true);
      expect(result.status).toBe('captured');
      expect(mockRepo.updateStatus).toHaveBeenCalledWith(
        existingPayment.id,
        PaymentStatus.CAPTURED,
        'pay_rzp_12345',
      );
    });

    it('Duplicate webhook does not double-apply: already captured payment returns quickly without updating', async () => {
      mockRazorpayClient.verifyWebhookSignature.mockReturnValue(true);
      mockRepo.findByRazorpayOrderId.mockResolvedValue({
        ...existingPayment,
        status: PaymentStatus.CAPTURED,
        razorpayPaymentId: 'pay_rzp_12345',
      });

      const result = await service.handleWebhook(rawBody, validSignature);

      expect(result.received).toBe(true);
      expect(result.status).toBe('already_captured');
      expect(mockRepo.updateStatus).not.toHaveBeenCalled();
    });
  });

  describe('getPaymentsForOrder', () => {
    it('returns payments list for authorized brand owner', async () => {
      mockRepo.findOrderById.mockResolvedValue(mockOrder);
      mockRepo.findByOrderId.mockResolvedValue([existingPayment]);

      const result = await service.getPaymentsForOrder(brandUser, 'order-123');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('pay-1');
    });

    it('returns payments list for authorized factory', async () => {
      mockRepo.findOrderById.mockResolvedValue(mockOrder);
      mockRepo.findByOrderId.mockResolvedValue([existingPayment]);

      const result = await service.getPaymentsForOrder(factoryUser, 'order-123');

      expect(result).toHaveLength(1);
    });

    it('denies cross-tenant brand with NotFoundError (404)', async () => {
      mockRepo.findOrderById.mockResolvedValue(mockOrder);

      await expect(
        service.getPaymentsForOrder(otherBrandUser, 'order-123'),
      ).rejects.toThrow(NotFoundError);
      expect(mockRepo.findByOrderId).not.toHaveBeenCalled();
    });
  });
});
