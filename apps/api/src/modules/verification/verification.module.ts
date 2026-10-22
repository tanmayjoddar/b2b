import { Module } from '@nestjs/common';
import { VerificationController } from './verification.controller.js';
import { VerificationService } from './verification.service.js';
import { VerificationRepository } from './verification.repository.js';

@Module({
  controllers: [VerificationController],
  providers: [VerificationService, VerificationRepository],
  exports: [VerificationService, VerificationRepository],
})
export class VerificationModule {}
