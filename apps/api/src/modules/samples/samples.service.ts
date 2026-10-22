import { Injectable, Logger } from '@nestjs/common';
import {
  AuthUser,
  Role,
  SampleStatus,
  SAMPLE_TRANSITIONS,
  CreateSampleDto,
  PaginationQuery,
} from '@factorymatch/shared';
import { SamplesRepository } from './samples.repository.js';
import { SamplesPolicy } from './samples.policy.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import {
  ConflictError,
  NotFoundError,
  ForbiddenError,
} from '../../common/errors/app-error.js';

@Injectable()
export class SamplesService {
  private readonly logger = new Logger(SamplesService.name);

  constructor(
    private readonly samplesRepo: SamplesRepository,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Creates a new sample request for a brief and factory.
   * Only brand owners or admins can request samples.
   */
  async createSample(user: AuthUser, dto: CreateSampleDto) {
    if (user.role !== Role.BRAND && user.role !== Role.ADMIN) {
      throw new ForbiddenError('Only brands or administrators can request samples');
    }

    const brief = await this.samplesRepo.findBriefById(dto.briefId);
    if (!brief) {
      throw new NotFoundError('Brief not found');
    }

    // Ownership check on brief: brand can only request samples for own briefs
    if (user.role === Role.BRAND) {
      if (!user.brandId || brief.brandId !== user.brandId) {
        throw new NotFoundError('Brief not found');
      }
    }

    const factory = await this.samplesRepo.findFactoryById(dto.factoryId);
    if (!factory) {
      throw new NotFoundError('Factory not found');
    }

    // Check for existing active sample for this brief and factory
    const existing = await this.samplesRepo.findByBriefAndFactory(
      dto.briefId,
      dto.factoryId,
    );
    if (existing && (existing.status as string) !== SampleStatus.REJECTED) {
      throw new ConflictError(
        'An active sample request already exists for this brief and factory',
      );
    }

    const sample = await this.samplesRepo.create(dto.briefId, dto.factoryId);
    this.logger.log(
      `Sample created: ${sample.id} for brief ${dto.briefId} and factory ${dto.factoryId}`,
    );
    return sample;
  }

  /**
   * Retrieves a sample by ID with policy authorization.
   */
  async getForUser(user: AuthUser, sampleId: string) {
    const sample = await this.samplesRepo.findById(sampleId);
    if (!sample) {
      throw new NotFoundError('Sample not found');
    }

    SamplesPolicy.assertCanView(user, sample);
    return sample;
  }

  /**
   * Lists samples accessible to the user based on tenant ownership.
   */
  async listForUser(user: AuthUser, pagination?: PaginationQuery) {
    if (user.role === Role.ADMIN) {
      return this.samplesRepo.findAll(pagination);
    }

    if (user.role === Role.BRAND && user.brandId) {
      return this.samplesRepo.findByBrandId(user.brandId, pagination);
    }

    if (user.role === Role.FACTORY && user.factoryId) {
      return this.samplesRepo.findByFactoryId(user.factoryId, pagination);
    }

    return [];
  }

  /**
   * Executes a verified sample status transition:
   * 1. Transaction & row lock
   * 2. Checks view permission
   * 3. Validates against SAMPLE_TRANSITIONS state machine
   * 4. Checks role permission
   * 5. Updates status with optional trackingRef / brandFeedback
   */
  async transition(
    user: AuthUser,
    sampleId: string,
    toStatus: SampleStatus,
    trackingRef?: string,
    brandFeedback?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const sample = await this.samplesRepo.lockAndFindById(tx, sampleId);
      if (!sample) {
        throw new NotFoundError('Sample not found');
      }

      // Check view permission (404 if denied)
      SamplesPolicy.assertCanView(user, sample);

      const currentStatus = sample.status as SampleStatus;

      // Validate against SAMPLE_TRANSITIONS state machine
      const allowedTransitions = SAMPLE_TRANSITIONS[currentStatus] ?? [];
      if (!allowedTransitions.includes(toStatus)) {
        throw new ConflictError(
          `Illegal sample transition from ${currentStatus} to ${toStatus}. Allowed transitions: ${
            allowedTransitions.join(', ') || 'none'
          }`,
        );
      }

      // Check role permissions
      SamplesPolicy.assertCanTransition(user, sample, toStatus);

      // Update sample status
      const updated = await this.samplesRepo.updateStatus(
        tx,
        sampleId,
        toStatus,
        trackingRef,
        brandFeedback,
      );

      this.logger.log(
        `Sample ${sampleId} transitioned: ${currentStatus} -> ${toStatus} by user ${user.id} (${user.role})`,
      );

      return updated;
    });
  }
}
