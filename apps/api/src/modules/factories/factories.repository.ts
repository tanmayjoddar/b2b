import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  CertificateStatus,
  CreateFactoryProfileDto,
  AddCapabilityDto,
  SubmitCertificateDto,
  FactoryStatus,
  VerificationTier,
} from '@factorymatch/shared';
import { PrismaService } from '../../infra/prisma/prisma.service.js';

export interface FactoryFilters {
  status?: FactoryStatus;
  tier?: VerificationTier;
  city?: string;
  state?: string;
}

export interface PaginationOptions {
  cursor?: string;
  limit?: number;
}

@Injectable()
export class FactoriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a new factory profile linked to the owner user
   */
  async createFactory(ownerUserId: string, dto: CreateFactoryProfileDto) {
    return this.prisma.factory.create({
      data: {
        ownerUserId,
        legalName: dto.legalName,
        city: dto.city,
        state: dto.state,
        pincode: dto.pincode,
        capacityNotes: dto.capacityNotes,
        leadTimeDaysMin: dto.leadTimeDaysMin,
        leadTimeDaysMax: dto.leadTimeDaysMax,
        status: FactoryStatus.PENDING,
        tier: VerificationTier.TIER_1_DOCUMENTS,
        verticals: dto.verticalId
          ? {
              create: {
                verticalId: dto.verticalId,
              },
            }
          : undefined,
      },
      include: {
        capabilities: true,
        certificates: true,
        verticals: true,
      },
    });
  }

  /**
   * Finds a factory by its ID with relations, excluding soft-deleted records
   */
  async findById(id: string) {
    return this.prisma.factory.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        capabilities: true,
        certificates: true,
        verticals: true,
      },
    });
  }

  /**
   * Finds factory profile for a specific owner user ID
   */
  async findByOwnerUserId(userId: string) {
    return this.prisma.factory.findFirst({
      where: {
        ownerUserId: userId,
        deletedAt: null,
      },
      include: {
        capabilities: true,
        certificates: true,
        verticals: true,
      },
    });
  }

  /**
   * Lists factories based on filters and cursor-based pagination
   */
  async listAll(filters: FactoryFilters = {}, pagination: PaginationOptions = {}) {
    const limit = Math.min(Math.max(pagination.limit || 20, 1), 100);

    const where: Prisma.FactoryWhereInput = {
      deletedAt: null,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.tier ? { tier: filters.tier } : {}),
      ...(filters.city ? { city: { equals: filters.city, mode: 'insensitive' } } : {}),
      ...(filters.state ? { state: { equals: filters.state, mode: 'insensitive' } } : {}),
    };

    const items = await this.prisma.factory.findMany({
      where,
      take: limit + 1,
      ...(pagination.cursor
        ? {
            cursor: { id: pagination.cursor },
            skip: 1,
          }
        : {}),
      orderBy: { createdAt: 'desc' },
      include: {
        capabilities: true,
        certificates: true,
        verticals: true,
      },
    });

    let nextCursor: string | undefined = undefined;
    if (items.length > limit) {
      const nextItem = items.pop();
      nextCursor = nextItem?.id;
    }

    return {
      items,
      nextCursor,
    };
  }

  /**
   * Adds a manufacturing capability to a factory
   */
  async addCapability(factoryId: string, dto: AddCapabilityDto) {
    return this.prisma.factoryCapability.create({
      data: {
        factoryId,
        verticalId: dto.verticalId,
        productType: dto.productType,
        moqUnits: dto.moqUnits,
        capacityUnitsPerMonth: dto.capacityUnitsPerMonth,
        packagingOptions: dto.packagingOptions,
        attributesJson: (dto.attributesJson ?? {}) as Prisma.InputJsonValue,
      },
    });
  }

  /**
   * Submits a compliance or quality certificate for verification
   */
  async submitCertificate(factoryId: string, dto: SubmitCertificateDto) {
    return this.prisma.certificate.create({
      data: {
        factoryId,
        type: dto.type,
        number: dto.number,
        issuer: dto.issuer,
        validFrom: new Date(dto.validFrom),
        validTo: new Date(dto.validTo),
        fileId: dto.fileId || null,
        status: CertificateStatus.SUBMITTED,
      },
    });
  }

  /**
   * Updates verification status of a certificate
   */
  async updateCertificateStatus(id: string, status: CertificateStatus) {
    return this.prisma.certificate.update({
      where: { id },
      data: { status },
    });
  }

  /**
   * Updates factory account status
   */
  async updateFactoryStatus(id: string, status: FactoryStatus) {
    return this.prisma.factory.update({
      where: { id },
      data: { status },
    });
  }

  /**
   * Updates factory verification tier
   */
  async updateFactoryTier(id: string, tier: VerificationTier) {
    return this.prisma.factory.update({
      where: { id },
      data: { tier },
    });
  }
}
