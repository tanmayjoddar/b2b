import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { SampleStatus, DEFAULT_PAGE_SIZE } from '@factorymatch/shared';

@Injectable()
export class SamplesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a sample record in REQUESTED status.
   */
  async create(briefId: string, factoryId: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.sample.create({
      data: {
        briefId,
        factoryId,
        status: SampleStatus.REQUESTED,
      },
      include: {
        brief: true,
        factory: true,
      },
    });
  }

  /**
   * Finds a sample by ID including its brief and factory relations.
   */
  async findById(id: string) {
    return this.prisma.sample.findUnique({
      where: { id },
      include: {
        brief: true,
        factory: true,
      },
    });
  }

  /**
   * Finds a sample by brief ID and factory ID.
   */
  async findByBriefAndFactory(briefId: string, factoryId: string) {
    return this.prisma.sample.findFirst({
      where: {
        briefId,
        factoryId,
      },
      include: {
        brief: true,
        factory: true,
      },
    });
  }

  /**
   * Finds paginated samples for a given brand.
   */
  async findByBrandId(brandId: string, pagination?: { cursor?: string; limit?: number }) {
    const limit = pagination?.limit ?? DEFAULT_PAGE_SIZE;
    return this.prisma.sample.findMany({
      where: {
        brief: {
          brandId,
        },
      },
      take: limit,
      skip: pagination?.cursor ? 1 : 0,
      cursor: pagination?.cursor ? { id: pagination.cursor } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        brief: true,
        factory: true,
      },
    });
  }

  /**
   * Finds paginated samples for a given factory.
   */
  async findByFactoryId(factoryId: string, pagination?: { cursor?: string; limit?: number }) {
    const limit = pagination?.limit ?? DEFAULT_PAGE_SIZE;
    return this.prisma.sample.findMany({
      where: { factoryId },
      take: limit,
      skip: pagination?.cursor ? 1 : 0,
      cursor: pagination?.cursor ? { id: pagination.cursor } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        brief: true,
        factory: true,
      },
    });
  }

  /**
   * Finds all paginated samples (for admin).
   */
  async findAll(pagination?: { cursor?: string; limit?: number }) {
    const limit = pagination?.limit ?? DEFAULT_PAGE_SIZE;
    return this.prisma.sample.findMany({
      take: limit,
      skip: pagination?.cursor ? 1 : 0,
      cursor: pagination?.cursor ? { id: pagination.cursor } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        brief: true,
        factory: true,
      },
    });
  }

  /**
   * Acquires a row lock on a sample row inside a transaction and returns it.
   */
  async lockAndFindById(tx: Prisma.TransactionClient, id: string) {
    await tx.$queryRaw`SELECT id FROM samples WHERE id = ${id} FOR UPDATE`;
    return tx.sample.findUnique({
      where: { id },
      include: {
        brief: true,
        factory: true,
      },
    });
  }

  /**
   * Updates sample status and optional trackingRef / brandFeedback.
   */
  async updateStatus(
    tx: Prisma.TransactionClient | undefined,
    id: string,
    status: SampleStatus,
    trackingRef?: string,
    brandFeedback?: string,
  ) {
    const client = tx ?? this.prisma;
    return client.sample.update({
      where: { id },
      data: {
        status,
        ...(trackingRef !== undefined ? { trackingRef } : {}),
        ...(brandFeedback !== undefined ? { brandFeedback } : {}),
      },
      include: {
        brief: true,
        factory: true,
      },
    });
  }

  /**
   * Finds a brief by ID for verification before creating a sample.
   */
  async findBriefById(briefId: string) {
    return this.prisma.brief.findUnique({
      where: { id: briefId },
      include: {
        brand: true,
      },
    });
  }

  /**
   * Finds a factory by ID for verification before creating a sample.
   */
  async findFactoryById(factoryId: string) {
    return this.prisma.factory.findUnique({
      where: { id: factoryId },
    });
  }
}
