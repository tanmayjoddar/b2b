import { Injectable, Logger } from '@nestjs/common';
import {
  AddCapabilityDto,
  AuthUser,
  CreateFactoryProfileDto,
  FactoryStatus,
  Role,
  SubmitCertificateDto,
  VerificationTier,
} from '@factorymatch/shared';
import { FactoriesRepository, FactoryFilters, PaginationOptions } from './factories.repository.js';
import {
  canEditFactory,
  canViewFactory,
  canViewPrivateDocs,
  toFactoryPublicProfile,
} from './factories.policy.js';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../common/errors/app-error.js';

@Injectable()
export class FactoriesService {
  private readonly logger = new Logger(FactoriesService.name);

  constructor(private readonly repo: FactoriesRepository) {}

  /**
   * Factory user registers and creates their factory profile.
   */
  async createProfile(user: AuthUser, dto: CreateFactoryProfileDto) {
    if (user.role !== Role.FACTORY) {
      throw new ForbiddenError('Only factory users can create a factory profile');
    }

    const existing = await this.repo.findByOwnerUserId(user.id);
    if (existing) {
      throw new ConflictError('A factory profile already exists for this account');
    }

    const factory = await this.repo.createFactory(user.id, dto);
    this.logger.log(`Factory profile created for user ${user.id} (factory: ${factory.id})`);
    return factory;
  }

  /**
   * Retrieves a factory profile by ID after enforcing authorization.
   * Returns public projection for brands; full profile for owner or admin.
   */
  async getProfile(user: AuthUser, factoryId: string) {
    const factory = await this.repo.findById(factoryId);
    if (!factory) {
      throw new NotFoundError('Factory not found');
    }

    // Authorization check: 404 instead of 403 to avoid leaking existence of unauthorized resources
    if (!canViewFactory(user, factory)) {
      throw new NotFoundError('Factory not found');
    }

    // Strip private documents and internal notes if caller cannot view private docs
    if (!canViewPrivateDocs(user, factory)) {
      return toFactoryPublicProfile(factory);
    }

    return factory;
  }

  /**
   * Lists factories directory with filtering and pagination.
   * Brands can only view ACTIVE factories.
   * Brands/Admin see public fields only in factory directory listings.
   */
  async listFactories(
    user: AuthUser,
    filters: FactoryFilters = {},
    pagination: PaginationOptions = {},
  ) {
    // Enforce active status filter for brands
    const effectiveFilters: FactoryFilters = {
      ...filters,
      status: user.role === Role.BRAND ? FactoryStatus.ACTIVE : filters.status,
    };

    const result = await this.repo.listAll(effectiveFilters, pagination);

    // Map all listings to public profile format
    const publicItems = result.items.map((factory) => toFactoryPublicProfile(factory));

    return {
      items: publicItems,
      nextCursor: result.nextCursor,
    };
  }

  /**
   * Adds a manufacturing capability to the factory profile.
   */
  async addCapability(user: AuthUser, factoryId: string, dto: AddCapabilityDto) {
    const factory = await this.repo.findById(factoryId);
    if (!factory) {
      throw new NotFoundError('Factory not found');
    }

    if (!canEditFactory(user, factory)) {
      throw new NotFoundError('Factory not found');
    }

    return this.repo.addCapability(factoryId, dto);
  }

  /**
   * Submits a compliance/quality certificate for verification.
   */
  async submitCertificate(user: AuthUser, factoryId: string, dto: SubmitCertificateDto) {
    const factory = await this.repo.findById(factoryId);
    if (!factory) {
      throw new NotFoundError('Factory not found');
    }

    if (!canEditFactory(user, factory)) {
      throw new NotFoundError('Factory not found');
    }

    const validFrom = new Date(dto.validFrom);
    const validTo = new Date(dto.validTo);

    if (isNaN(validFrom.getTime()) || isNaN(validTo.getTime())) {
      throw new ValidationError('Invalid certificate validity date format');
    }

    if (validTo <= validFrom) {
      throw new ValidationError('Certificate validTo date must be after validFrom date');
    }

    return this.repo.submitCertificate(factoryId, dto);
  }
}
