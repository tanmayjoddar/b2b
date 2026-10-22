import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { validateEnv } from './config/env.schema.js';
import { PrismaModule } from './infra/prisma/prisma.module.js';
import { RazorpayModule } from './infra/razorpay/razorpay.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { FactoriesModule } from './modules/factories/factories.module.js';
import { VerificationModule } from './modules/verification/verification.module.js';
import { BriefsModule } from './modules/briefs/briefs.module.js';
import { MatchingModule } from './modules/matching/matching.module.js';
import { QuotesModule } from './modules/quotes/quotes.module.js';
import { OrdersModule } from './modules/orders/orders.module.js';
import { SamplesModule } from './modules/samples/samples.module.js';
import { PaymentsModule } from './modules/payments/payments.module.js';
import { ReviewsModule } from './modules/reviews/reviews.module.js';
import { AuditModule } from './modules/audit/audit.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    PrismaModule,
    RazorpayModule,
    HealthModule,
    AuthModule,
    FactoriesModule,
    VerificationModule,
    BriefsModule,
    MatchingModule,
    QuotesModule,
    OrdersModule,
    SamplesModule,
    PaymentsModule,
    ReviewsModule,
    AuditModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
