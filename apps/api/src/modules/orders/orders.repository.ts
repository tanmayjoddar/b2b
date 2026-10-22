import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { OrderStatus, DEFAULT_PAGE_SIZE } from '@factorymatch/shared';

@Injectable()
export class OrdersRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a new Order record with initial status CONFIRMED.
   */
  async create(
    brandId: string,
    factoryId: string,
    quoteId: string,
    totalPaise: number,
    quantityUnits: number,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;
    return client.order.create({
      data: {
        brandId,
        factoryId,
        quoteId,
        totalPaise,
        quantityUnits,
        status: OrderStatus.CONFIRMED,
      },
      include: {
        brand: true,
        factory: true,
        quote: true,
        events: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  /**
   * Finds an order by its ID, with brand, factory, quote, and events included.
   */
  async findById(id: string) {
    return this.prisma.order.findUnique({
      where: { id },
      include: {
        brand: true,
        factory: true,
        quote: true,
        events: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  /**
   * Finds paginated orders belonging to a brand.
   */
  async findByBrandId(brandId: string, pagination?: { cursor?: string; limit?: number }) {
    const limit = pagination?.limit ?? DEFAULT_PAGE_SIZE;
    return this.prisma.order.findMany({
      where: { brandId },
      take: limit,
      skip: pagination?.cursor ? 1 : 0,
      cursor: pagination?.cursor ? { id: pagination.cursor } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        brand: true,
        factory: true,
        quote: true,
      },
    });
  }

  /**
   * Finds paginated orders belonging to a factory.
   */
  async findByFactoryId(factoryId: string, pagination?: { cursor?: string; limit?: number }) {
    const limit = pagination?.limit ?? DEFAULT_PAGE_SIZE;
    return this.prisma.order.findMany({
      where: { factoryId },
      take: limit,
      skip: pagination?.cursor ? 1 : 0,
      cursor: pagination?.cursor ? { id: pagination.cursor } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        brand: true,
        factory: true,
        quote: true,
      },
    });
  }

  /**
   * Finds all paginated orders (admin query).
   */
  async findAll(pagination?: { cursor?: string; limit?: number }) {
    const limit = pagination?.limit ?? DEFAULT_PAGE_SIZE;
    return this.prisma.order.findMany({
      take: limit,
      skip: pagination?.cursor ? 1 : 0,
      cursor: pagination?.cursor ? { id: pagination.cursor } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        brand: true,
        factory: true,
        quote: true,
      },
    });
  }

  /**
   * Acquires a row-level lock (SELECT FOR UPDATE) on the order row inside a transaction
   * and returns the order with relations.
   */
  async lockAndFindById(tx: Prisma.TransactionClient, id: string) {
    await tx.$queryRaw`SELECT id FROM orders WHERE id = ${id} FOR UPDATE`;
    return tx.order.findUnique({
      where: { id },
      include: {
        brand: true,
        factory: true,
        quote: true,
        events: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  /**
   * Updates an order's status inside a transaction.
   */
  async updateStatus(tx: Prisma.TransactionClient, id: string, status: OrderStatus) {
    return tx.order.update({
      where: { id },
      data: { status },
      include: {
        brand: true,
        factory: true,
        quote: true,
      },
    });
  }

  /**
   * Appends an append-only OrderEvent record inside a transaction.
   */
  async appendEvent(
    tx: Prisma.TransactionClient,
    orderId: string,
    fromStatus: OrderStatus,
    toStatus: OrderStatus,
    actorUserId: string,
    reason?: string | null,
  ) {
    return tx.orderEvent.create({
      data: {
        orderId,
        fromStatus,
        toStatus,
        actorUserId,
        reason: reason ?? null,
      },
    });
  }

  /**
   * Retrieves timeline events for an order.
   */
  async findEventsByOrderId(orderId: string) {
    return this.prisma.orderEvent.findMany({
      where: { orderId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Helper to retrieve a Quote along with its QuoteRequest and Brief for order creation validation.
   */
  async findQuoteById(quoteId: string) {
    return this.prisma.quote.findUnique({
      where: { id: quoteId },
      include: {
        quoteRequest: {
          include: {
            brief: true,
          },
        },
      },
    });
  }
}
