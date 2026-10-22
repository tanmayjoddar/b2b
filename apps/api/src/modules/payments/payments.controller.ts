import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  Headers,
} from '@nestjs/common';
import { Request } from 'express';
import {
  AuthUser,
  CreatePaymentDto,
  CreatePaymentSchema,
  PaymentResponse,
  Role,
  VerifyPaymentSignatureDto,
  VerifyPaymentSignatureSchema,
} from '@factorymatch/shared';
import { PaymentsService } from './payments.service.js';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';

export function toPaymentResponse(payment: any): PaymentResponse {
  return {
    id: payment.id,
    orderId: payment.orderId,
    milestone: payment.milestone,
    amountPaise: payment.amountPaise,
    status: payment.status,
    razorpayOrderId: payment.razorpayOrderId,
    razorpayPaymentId: payment.razorpayPaymentId,
    idempotencyKey: payment.idempotencyKey,
    createdAt:
      payment.createdAt instanceof Date
        ? payment.createdAt.toISOString()
        : String(payment.createdAt),
  };
}

@Controller('api/v1')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * POST /api/v1/payments - Create payment for an order milestone (BRAND only).
   */
  @Post('payments')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.BRAND)
  async createPayment(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(CreatePaymentSchema)) dto: CreatePaymentDto,
  ): Promise<{ data: PaymentResponse }> {
    const payment = await this.paymentsService.createPayment(user, dto);
    return { data: toPaymentResponse(payment) };
  }

  /**
   * POST /api/v1/payments/verify - Verify Razorpay payment signature (BRAND only).
   */
  @Post('payments/verify')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.BRAND)
  async verifyPayment(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(VerifyPaymentSignatureSchema)) dto: VerifyPaymentSignatureDto,
  ): Promise<{ data: PaymentResponse }> {
    const payment = await this.paymentsService.verifyPayment(user, dto);
    return { data: toPaymentResponse(payment) };
  }

  /**
   * POST /api/v1/webhooks/razorpay - Razorpay webhook handler.
   * NOTE: No AuthGuard. Authenticated via Razorpay webhook signature header.
   */
  @Post('webhooks/razorpay')
  @HttpCode(HttpStatus.OK)
  async handleRazorpayWebhook(
    @Req() req: Request,
    @Headers('x-razorpay-signature') signatureHeader?: string,
  ): Promise<{ data: { received: boolean; status?: string } }> {
    const signature = signatureHeader || (req.headers['x-razorpay-signature'] as string) || '';
    const rawBody =
      (req as any).rawBody ||
      (typeof req.body === 'string' ? req.body : JSON.stringify(req.body));

    const result = await this.paymentsService.handleWebhook(rawBody, signature);
    return { data: result };
  }

  /**
   * GET /api/v1/orders/:orderId/payments - List payments for an order.
   */
  @Get('orders/:orderId/payments')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.BRAND, Role.FACTORY, Role.ADMIN)
  async getPaymentsForOrder(
    @CurrentUser() user: AuthUser,
    @Param('orderId') orderId: string,
  ): Promise<{ data: PaymentResponse[] }> {
    const payments = await this.paymentsService.getPaymentsForOrder(user, orderId);
    return { data: payments.map(toPaymentResponse) };
  }

  /**
   * GET /api/v1/payments/:id - Get payment details by ID.
   */
  @Get('payments/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.BRAND, Role.FACTORY, Role.ADMIN)
  async getPaymentById(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<{ data: PaymentResponse }> {
    const payment = await this.paymentsService.getPaymentById(user, id);
    return { data: toPaymentResponse(payment) };
  }
}
