import { Injectable, Logger } from '@nestjs/common';
import {
  AuthUser,
  BriefStatus,
  CreateShortlistDto,
  Role,
} from '@factorymatch/shared';
import { MatchingRepository } from './matching.repository.js';
import { BriefsService } from '../briefs/briefs.service.js';
import { canCreateShortlist } from './matching.policy.js';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../common/errors/app-error.js';

@Injectable()
export class MatchingService {
  private readonly logger = new Logger(MatchingService.name);

  constructor(
    private readonly repo: MatchingRepository,
    private readonly briefsService: BriefsService,
  ) {}

  /**
   * Admin matches and creates a shortlist of factories for a brief.
   * Validates brief exists and is in SUBMITTED or MATCHING status.
   * Transitions brief to SHORTLISTED.
   */
  async createShortlist(adminUser: AuthUser, dto: CreateShortlistDto) {
    if (!canCreateShortlist(adminUser)) {
      throw new ForbiddenError('Only admin can create shortlists');
    }

    const brief = await this.briefsService.findById(dto.briefId);
    if (!brief) {
      throw new NotFoundError('Brief not found');
    }

    if (
      brief.status !== BriefStatus.SUBMITTED &&
      brief.status !== BriefStatus.MATCHING
    ) {
      throw new ConflictError(
        `Cannot shortlist brief in status '${brief.status}'. Brief must be in SUBMITTED or MATCHING status.`,
      );
    }

    const shortlist = await this.repo.createShortlist(
      dto.briefId,
      adminUser.id,
      dto.factoryIds,
      dto.notes,
    );

    this.logger.log(
      `Shortlist created for brief ${dto.briefId} by admin ${adminUser.id} with ${dto.factoryIds.length} factories`,
    );

    return shortlist;
  }

  /**
   * Retrieves shortlist for a brief.
   * - ADMIN sees any shortlist.
   * - BRAND sees only shortlist for briefs they own (404 otherwise).
   */
  async getShortlistForUser(user: AuthUser, briefId: string) {
    if (user.role === Role.ADMIN) {
      const shortlist = await this.repo.findShortlistByBriefId(briefId);
      if (!shortlist) {
        throw new NotFoundError('Shortlist not found for this brief');
      }
      return shortlist;
    }

    if (user.role === Role.BRAND) {
      if (!user.brandId) {
        throw new ForbiddenError('User has no associated brand profile');
      }

      const shortlist = await this.repo.getShortlistForBrand(briefId, user.brandId);
      if (!shortlist) {
        // Return 404 to avoid leaking brief existence or shortlist status
        throw new NotFoundError('Shortlist not found');
      }

      return shortlist;
    }

    throw new ForbiddenError('Access denied');
  }
}
