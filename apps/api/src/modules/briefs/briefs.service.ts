import { Injectable, Logger } from '@nestjs/common';
import {
  AuthUser,
  BriefStatus,
  CreateBriefDto,
  PaginationQuery,
  Role,
  UpdateBriefDto,
} from '@factorymatch/shared';
import { BriefsRepository, BriefFilters } from './briefs.repository.js';
import {
  canCancelBrief,
  canEditBrief,
  canSubmitBrief,
  canViewBrief,
  isAllowedBriefTransition,
} from './briefs.policy.js';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../common/errors/app-error.js';

@Injectable()
export class BriefsService {
  private readonly logger = new Logger(BriefsService.name);

  constructor(private readonly repo: BriefsRepository) {}

  /**
   * Internal lookup method for other services.
   */
  async findById(id: string) {
    return this.repo.findById(id);
  }

  /**
   * Brand creates a new brief in DRAFT status.
   * Brand ID is always sourced from the authenticated user.
   */
  async create(user: AuthUser, dto: CreateBriefDto) {
    if (user.role !== Role.BRAND || !user.brandId) {
      throw new ForbiddenError('Only registered brands can create briefs');
    }

    const brief = await this.repo.create(user.brandId, dto);
    this.logger.log(`Brief ${brief.id} created in DRAFT status by brand ${user.brandId}`);
    return brief;
  }

  /**
   * Fetches a brief for a user with policy checks.
   * Returns 404 if the brief does not exist or the user is not authorized to know it exists.
   */
  async getForUser(user: AuthUser, id: string) {
    const brief = await this.repo.findById(id);

    if (!brief) {
      throw new NotFoundError('Brief not found');
    }

    if (!canViewBrief(user, brief, user.factoryId ?? undefined)) {
      // Return 404 instead of 403 to prevent enumeration of briefs across tenants
      throw new NotFoundError('Brief not found');
    }

    return brief;
  }

  /**
   * Lists briefs for the authenticated user based on role:
   * - ADMIN sees all briefs
   * - BRAND sees only their own briefs
   * - FACTORY sees briefs where they are shortlisted
   */
  async listForUser(
    user: AuthUser,
    pagination?: PaginationQuery,
    filters?: BriefFilters,
  ) {
    if (user.role === Role.ADMIN) {
      return this.repo.listAll(filters, pagination);
    }

    if (user.role === Role.BRAND) {
      if (!user.brandId) {
        return [];
      }
      return this.repo.findByBrandId(user.brandId, pagination);
    }

    if (user.role === Role.FACTORY) {
      if (!user.factoryId) {
        return [];
      }
      return this.repo.findByFactoryId(user.factoryId, pagination);
    }

    return [];
  }

  /**
   * Updates a draft brief.
   * Only the owning brand can update, and only while in DRAFT status.
   */
  async update(user: AuthUser, id: string, dto: UpdateBriefDto) {
    const brief = await this.repo.findById(id);

    if (!brief) {
      throw new NotFoundError('Brief not found');
    }

    // Tenant check: return 404 for other brands to avoid existence leakage
    if (user.role !== Role.BRAND || !user.brandId || user.brandId !== brief.brandId) {
      throw new NotFoundError('Brief not found');
    }

    if (!canEditBrief(user, brief)) {
      throw new ConflictError(
        `Cannot edit brief in status '${brief.status}'. Only DRAFT briefs can be edited.`,
      );
    }

    const updated = await this.repo.update(id, dto);
    this.logger.log(`Brief ${id} updated by brand ${user.brandId}`);
    return updated;
  }

  /**
   * Submits a draft brief, transitioning status to SUBMITTED.
   */
  async submit(user: AuthUser, id: string) {
    const brief = await this.repo.findById(id);

    if (!brief) {
      throw new NotFoundError('Brief not found');
    }

    if (user.role !== Role.BRAND || !user.brandId || user.brandId !== brief.brandId) {
      throw new NotFoundError('Brief not found');
    }

    if (!canSubmitBrief(user, brief)) {
      throw new ConflictError(
        `Cannot submit brief in status '${brief.status}'. Only DRAFT briefs can be submitted.`,
      );
    }

    if (!isAllowedBriefTransition(brief.status, BriefStatus.SUBMITTED)) {
      throw new ConflictError(
        `Illegal transition from '${brief.status}' to '${BriefStatus.SUBMITTED}'`,
      );
    }

    const updated = await this.repo.updateStatus(id, BriefStatus.SUBMITTED);
    this.logger.log(`Brief ${id} submitted for matching by brand ${user.brandId}`);
    return updated;
  }

  /**
   * Cancels a brief from any non-terminal state.
   */
  async cancel(user: AuthUser, id: string) {
    const brief = await this.repo.findById(id);

    if (!brief) {
      throw new NotFoundError('Brief not found');
    }

    // If BRAND role, ensure ownership
    if (user.role === Role.BRAND && (!user.brandId || user.brandId !== brief.brandId)) {
      throw new NotFoundError('Brief not found');
    }

    if (!canCancelBrief(user, brief)) {
      if (
        brief.status === BriefStatus.CLOSED ||
        brief.status === BriefStatus.CANCELLED
      ) {
        throw new ConflictError(
          `Cannot cancel brief in terminal status '${brief.status}'`,
        );
      }
      throw new ForbiddenError('You are not authorized to cancel this brief');
    }

    if (!isAllowedBriefTransition(brief.status, BriefStatus.CANCELLED)) {
      throw new ConflictError(
        `Illegal transition from '${brief.status}' to '${BriefStatus.CANCELLED}'`,
      );
    }

    const updated = await this.repo.updateStatus(id, BriefStatus.CANCELLED);
    this.logger.log(`Brief ${id} cancelled by user ${user.id} (${user.role})`);
    return updated;
  }
}
