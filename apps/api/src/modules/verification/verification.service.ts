import { Injectable, Logger } from '@nestjs/common';
import { AdminVerifyFactoryDto, AuthUser, FactoryStatus, VerificationTier } from '@factorymatch/shared';
import { VerificationRepository } from './verification.repository.js';
import { canVerifyFactory } from '../factories/factories.policy.js';
import { ForbiddenError, NotFoundError } from '../../common/errors/app-error.js';

@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);

  constructor(private readonly repo: VerificationRepository) {}

  /**
   * Admin verifies a factory:
   * Creates verification record, updates factory tier and status, and generates an audit log entry.
   */
  async verifyFactory(adminUser: AuthUser, factoryId: string, dto: AdminVerifyFactoryDto) {
    if (!canVerifyFactory(adminUser)) {
      throw new ForbiddenError('Only admin users can verify factories');
    }

    const factory = await this.repo.findFactoryById(factoryId);
    if (!factory) {
      throw new NotFoundError('Factory not found');
    }

    const result = await this.repo.executeVerificationTx({
      factoryId,
      dto,
      adminId: adminUser.id,
      beforeFactory: {
        status: factory.status as unknown as FactoryStatus,
        tier: factory.tier as unknown as VerificationTier,
      },
    });

    this.logger.log(
      `Admin ${adminUser.id} verified factory ${factoryId}: Tier changed to ${dto.tier}, status changed to ${dto.newStatus}`,
    );

    return result;
  }

  /**
   * Retrieves all verification audit history for a factory. Admin only.
   */
  async getVerifications(adminUser: AuthUser, factoryId: string) {
    if (!canVerifyFactory(adminUser)) {
      throw new ForbiddenError('Only admin users can view verification records');
    }

    const factory = await this.repo.findFactoryById(factoryId);
    if (!factory) {
      throw new NotFoundError('Factory not found');
    }

    return this.repo.findByFactoryId(factoryId);
  }
}
