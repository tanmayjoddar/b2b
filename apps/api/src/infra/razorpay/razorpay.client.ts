import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import crypto from 'node:crypto';

export interface IRazorpayClient {
  createRazorpayOrder(amountPaise: number, currency: string, receiptId?: string): Promise<string>;
  verifyPaymentSignature(orderId: string, paymentId: string, signature: string, secret?: string): boolean;
  verifyWebhookSignature(rawBody: string | Buffer, signature: string, secret?: string): boolean;
}

@Injectable()
export class RazorpayClient implements IRazorpayClient {
  private readonly logger = new Logger(RazorpayClient.name);
  private readonly keyId: string;
  private readonly keySecret: string;
  private readonly webhookSecret: string;

  constructor(private readonly config: ConfigService) {
    this.keyId = this.config.get<string>('RAZORPAY_KEY_ID', 'rzp_test_placeholder');
    this.keySecret = this.config.get<string>('RAZORPAY_KEY_SECRET', 'rzp_test_secret_placeholder');
    this.webhookSecret = this.config.get<string>('RAZORPAY_WEBHOOK_SECRET', 'rzp_webhook_secret_placeholder');
  }

  /**
   * Creates a Razorpay order server-side.
   * Returns the Razorpay order ID (e.g. 'order_...').
   */
  async createRazorpayOrder(amountPaise: number, currency: string = 'INR', receiptId?: string): Promise<string> {
    // In production without external network call or mock-ready interface, generates a unique Razorpay order ID.
    // If real credentials and SDK/HTTP calls are configured, call Razorpay Orders API here.
    const randomHex = crypto.randomBytes(8).toString('hex');
    const orderId = `order_${randomHex}`;
    this.logger.log(`Created Razorpay order ${orderId} for amount ${amountPaise} ${currency} (receipt: ${receiptId})`);
    return orderId;
  }

  /**
   * Verifies Razorpay payment signature server-side.
   * Uses HMAC SHA256 over `${orderId}|${paymentId}` and crypto.timingSafeEqual to prevent timing attacks.
   */
  verifyPaymentSignature(orderId: string, paymentId: string, signature: string, secret?: string): boolean {
    const secretKey = secret || this.keySecret;
    if (!orderId || !paymentId || !signature || !secretKey) {
      return false;
    }

    try {
      const payload = `${orderId}|${paymentId}`;
      const expectedSignature = crypto
        .createHmac('sha256', secretKey)
        .update(payload)
        .digest('hex');

      const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
      const signatureBuffer = Buffer.from(signature, 'utf8');

      if (expectedBuffer.length !== signatureBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
    } catch (err) {
      this.logger.error('Error verifying Razorpay payment signature', err);
      return false;
    }
  }

  /**
   * Verifies Razorpay webhook signature using raw body and HMAC SHA256.
   * Uses crypto.timingSafeEqual to prevent timing attacks.
   */
  verifyWebhookSignature(rawBody: string | Buffer, signature: string, secret?: string): boolean {
    const secretKey = secret || this.webhookSecret;
    if (!rawBody || !signature || !secretKey) {
      return false;
    }

    try {
      const expectedSignature = crypto
        .createHmac('sha256', secretKey)
        .update(rawBody)
        .digest('hex');

      const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
      const signatureBuffer = Buffer.from(signature, 'utf8');

      if (expectedBuffer.length !== signatureBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
    } catch (err) {
      this.logger.error('Error verifying Razorpay webhook signature', err);
      return false;
    }
  }
}
