import { Module } from '@nestjs/common';
import { RazorpayClient } from './razorpay.client.js';

@Module({
  providers: [RazorpayClient],
  exports: [RazorpayClient],
})
export class RazorpayModule {}
