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
import { PaymentsController } from './payments.controller.js';
import { PaymentsService } from './payments.service.js';

describe('PaymentsController', () => {
  let controller: PaymentsController;
  let mockService: any;

  const mockUser: AuthUser = {
    id: 'usr-brand-1',
    email: 'brand@example.com',
    phone: '+919876543210',
    role: Role.BRAND,
    status: UserStatus.ACTIVE,
    brandId: 'brand-1',
  };

  const mockPayment = {
    id: 'pay-1',
    orderId: 'order-123',
    milestone: PaymentMilestone.ADVANCE,
    amountPaise: 500000,
    status: PaymentStatus.PENDING,
    razorpayOrderId: 'order_rzp_123',
    razorpayPaymentId: null,
    idempotencyKey: 'idemp-123',
    createdAt: new Date('2026-10-22T12:00:00.000Z'),
    updatedAt: new Date('2026-10-22T12:00:00.000Z'),
  };

  beforeEach(() => {
    mockService = {
      createPayment: vi.fn(),
      verifyPayment: vi.fn(),
      handleWebhook: vi.fn(),
      getPaymentsForOrder: vi.fn(),
      getPaymentById: vi.fn(),
    };

    controller = new PaymentsController(mockService as unknown as PaymentsService);
  });

  describe('createPayment', () => {
    it('creates payment and returns formatted response envelope', async () => {
      const dto: CreatePaymentDto = {
        orderId: 'order-123',
        milestone: PaymentMilestone.ADVANCE,
        amountPaise: 500000,
        idempotencyKey: 'idemp-123',
      };

      mockService.createPayment.mockResolvedValue(mockPayment);

      const response = await controller.createPayment(mockUser, dto);

      expect(mockService.createPayment).toHaveBeenCalledWith(mockUser, dto);
      expect(response.data).toEqual({
        id: 'pay-1',
        orderId: 'order-123',
        milestone: PaymentMilestone.ADVANCE,
        amountPaise: 500000,
        status: PaymentStatus.PENDING,
        razorpayOrderId: 'order_rzp_123',
        razorpayPaymentId: null,
        idempotencyKey: 'idemp-123',
        createdAt: '2026-10-22T12:00:00.000Z',
      });
    });
  });

  describe('verifyPayment', () => {
    it('verifies signature and returns updated captured payment', async () => {
      const dto: VerifyPaymentSignatureDto = {
        razorpay_order_id: 'order_rzp_123',
        razorpay_payment_id: 'pay_rzp_456',
        razorpay_signature: 'signature_valid',
      };

      const capturedPayment = {
        ...mockPayment,
        status: PaymentStatus.CAPTURED,
        razorpayPaymentId: 'pay_rzp_456',
      };
      mockService.verifyPayment.mockResolvedValue(capturedPayment);

      const response = await controller.verifyPayment(mockUser, dto);

      expect(mockService.verifyPayment).toHaveBeenCalledWith(mockUser, dto);
      expect(response.data.status).toBe(PaymentStatus.CAPTURED);
      expect(response.data.razorpayPaymentId).toBe('pay_rzp_456');
    });
  });

  describe('handleRazorpayWebhook', () => {
    it('processes webhook and returns result envelope', async () => {
      const mockReq = {
        headers: {
          'x-razorpay-signature': 'sig_123',
        },
        body: JSON.stringify({ entity: 'event', event: 'payment.captured' }),
      } as any;

      mockService.handleWebhook.mockResolvedValue({ received: true, status: 'captured' });

      const response = await controller.handleRazorpayWebhook(mockReq, 'sig_123');

      expect(mockService.handleWebhook).toHaveBeenCalledWith(mockReq.body, 'sig_123');
      expect(response.data).toEqual({ received: true, status: 'captured' });
    });
  });

  describe('getPaymentsForOrder', () => {
    it('returns array of payments for order', async () => {
      mockService.getPaymentsForOrder.mockResolvedValue([mockPayment]);

      const response = await controller.getPaymentsForOrder(mockUser, 'order-123');

      expect(mockService.getPaymentsForOrder).toHaveBeenCalledWith(mockUser, 'order-123');
      expect(response.data).toHaveLength(1);
      expect(response.data[0].id).toBe('pay-1');
    });
  });
});
