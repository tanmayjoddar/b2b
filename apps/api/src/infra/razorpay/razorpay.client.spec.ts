import { describe, it, expect, beforeEach } from 'vitest';
import crypto from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { RazorpayClient } from './razorpay.client.js';

describe('RazorpayClient', () => {
  let client: RazorpayClient;
  let mockConfig: ConfigService;

  const testKeySecret = 'test_secret_key_12345';
  const testWebhookSecret = 'test_webhook_secret_67890';

  beforeEach(() => {
    mockConfig = {
      get: (key: string, defaultVal?: string) => {
        if (key === 'RAZORPAY_KEY_ID') return 'rzp_test_key_id';
        if (key === 'RAZORPAY_KEY_SECRET') return testKeySecret;
        if (key === 'RAZORPAY_WEBHOOK_SECRET') return testWebhookSecret;
        return defaultVal;
      },
    } as unknown as ConfigService;

    client = new RazorpayClient(mockConfig);
  });

  describe('createRazorpayOrder', () => {
    it('generates a valid razorpay order ID starting with order_', async () => {
      const orderId = await client.createRazorpayOrder(500000, 'INR', 'order-123');
      expect(orderId).toBeDefined();
      expect(orderId).toMatch(/^order_[a-f0-9]{16}$/);
    });
  });

  describe('verifyPaymentSignature', () => {
    const orderId = 'order_DBJOWzybf0sJbb';
    const paymentId = 'pay_29QQoUBi66xm2f';

    it('verifies valid HMAC SHA256 signature using timingSafeEqual', () => {
      const payload = `${orderId}|${paymentId}`;
      const validSignature = crypto
        .createHmac('sha256', testKeySecret)
        .update(payload)
        .digest('hex');

      const result = client.verifyPaymentSignature(orderId, paymentId, validSignature);
      expect(result).toBe(true);
    });

    it('rejects tampered signature', () => {
      const tamperedSignature = 'tampered_signature_that_does_not_match';
      const result = client.verifyPaymentSignature(orderId, paymentId, tamperedSignature);
      expect(result).toBe(false);
    });

    it('rejects signature when orderId or paymentId is wrong', () => {
      const payload = `${orderId}|${paymentId}`;
      const validSignature = crypto
        .createHmac('sha256', testKeySecret)
        .update(payload)
        .digest('hex');

      const result = client.verifyPaymentSignature('different_order', paymentId, validSignature);
      expect(result).toBe(false);
    });
  });

  describe('verifyWebhookSignature', () => {
    const rawBody = JSON.stringify({
      entity: 'event',
      event: 'payment.captured',
      created_at: 1698000000,
    });

    it('verifies valid webhook signature on raw body using timingSafeEqual', () => {
      const validSignature = crypto
        .createHmac('sha256', testWebhookSecret)
        .update(rawBody)
        .digest('hex');

      const result = client.verifyWebhookSignature(rawBody, validSignature);
      expect(result).toBe(true);
    });

    it('verifies valid webhook signature when rawBody is a Buffer', () => {
      const rawBuffer = Buffer.from(rawBody, 'utf8');
      const validSignature = crypto
        .createHmac('sha256', testWebhookSecret)
        .update(rawBuffer)
        .digest('hex');

      const result = client.verifyWebhookSignature(rawBuffer, validSignature);
      expect(result).toBe(true);
    });

    it('rejects invalid webhook signature', () => {
      const invalidSignature = 'invalid_webhook_signature_string';
      const result = client.verifyWebhookSignature(rawBody, invalidSignature);
      expect(result).toBe(false);
    });

    it('rejects tampered raw body with same signature', () => {
      const validSignature = crypto
        .createHmac('sha256', testWebhookSecret)
        .update(rawBody)
        .digest('hex');

      const tamperedBody = rawBody + ' ';
      const result = client.verifyWebhookSignature(tamperedBody, validSignature);
      expect(result).toBe(false);
    });
  });
});
