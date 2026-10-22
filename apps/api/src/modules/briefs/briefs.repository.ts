import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import {
  BriefStatus,
  CreateBriefDto,
  UpdateBriefDto,
  PaginationQuery,
  DEFAULT_PAGE_SIZE,
} from '@factorymatch/shared';

export interface BriefFilters {
  status?: BriefStatus;
  verticalId?: string;
  brandId?: string;
}

@Injectable()
export class BriefsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a new brief in DRAFT status.
   * Brand ID is sourced directly from authenticated session.
   */
  async create(brandId: string, dto: CreateBriefDto) {
    return this.prisma.brief.create({
      data: {
        brandId,
        verticalId: dto.verticalId,
        productName: dto.productName,
        quantityUnits: dto.quantityUnits,
        targetPricePaiseMin: dto.targetPricePaiseMin ?? null,
        targetPricePaiseMax: dto.targetPricePaiseMax ?? null,
        requirementsJson: (dto.requirementsJson ?? {}) as any,
        timelineWeeks: dto.timelineWeeks,
        status: BriefStatus.DRAFT,
      },
      include: {
        brand: true,
        vertical: true,
      },
    });
  }

  /**
   * Finds a brief by ID, filtering out soft-deleted records.
   * Includes brand relation and shortlists with shortlisted factory items.
   */
  async findById(id: string) {
    return this.prisma.brief.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        brand: true,
        vertical: true,
        shortlists: {
          include: {
            items: {
              include: {
                factory: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Finds briefs for a brand with pagination.
   */
  async findByBrandId(brandId: string, pagination?: PaginationQuery) {
    const limit = pagination?.limit ?? DEFAULT_PAGE_SIZE;
    const cursor = pagination?.cursor;

    return this.prisma.brief.findMany({
      where: {
        brandId,
        deletedAt: null,
      },
      take: limit,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { createdAt: 'desc' },
      include: {
        brand: true,
        vertical: true,
      },
    });
  }

  /**
   * Finds briefs where a factory is shortlisted with pagination.
   */
  async findByFactoryId(factoryId: string, pagination?: PaginationQuery) {
    const limit = pagination?.limit ?? DEFAULT_PAGE_SIZE;
    const cursor = pagination?.cursor;

    return this.prisma.brief.findMany({
      where: {
        deletedAt: null,
        shortlists: {
          some: {
            items: {
              some: {
                factoryId,
              },
            },
          },
        },
      },
      take: limit,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { createdAt: 'desc' },
      include: {
        brand: true,
        vertical: true,
        shortlists: {
          include: {
            items: true,
          },
        },
      },
    });
  }

  /**
   * Updates mutable fields of a brief (mass-assignment safe).
   */
  async update(id: string, dto: UpdateBriefDto) {
    return this.prisma.brief.update({
      where: { id },
      data: {
        ...(dto.verticalId !== undefined && { verticalId: dto.verticalId }),
        ...(dto.productName !== undefined && { productName: dto.productName }),
        ...(dto.quantityUnits !== undefined && { quantityUnits: dto.quantityUnits }),
        ...(dto.targetPricePaiseMin !== undefined && { targetPricePaiseMin: dto.targetPricePaiseMin }),
        ...(dto.targetPricePaiseMax !== undefined && { targetPricePaiseMax: dto.targetPricePaiseMax }),
        ...(dto.requirementsJson !== undefined && { requirementsJson: dto.requirementsJson as any }),
        ...(dto.timelineWeeks !== undefined && { timelineWeeks: dto.timelineWeeks }),
      },
      include: {
        brand: true,
        vertical: true,
      },
    });
  }

  /**
   * Explicitly updates brief status.
   */
  async updateStatus(id: string, status: BriefStatus) {
    return this.prisma.brief.update({
      where: { id },
      data: { status },
      include: {
        brand: true,
        vertical: true,
      },
    });
  }

  /**
   * Lists all briefs with optional filters for admins.
   */
  async listAll(filters?: BriefFilters, pagination?: PaginationQuery) {
    const limit = pagination?.limit ?? DEFAULT_PAGE_SIZE;
    const cursor = pagination?.cursor;

    return this.prisma.brief.findMany({
      where: {
        deletedAt: null,
        ...(filters?.status && { status: filters.status }),
        ...(filters?.verticalId && { verticalId: filters.verticalId }),
        ...(filters?.brandId && { brandId: filters.brandId }),
      },
      take: limit,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { createdAt: 'desc' },
      include: {
        brand: true,
        vertical: true,
      },
    });
  }
}
