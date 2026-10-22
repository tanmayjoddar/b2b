import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import {
  QuoteStatus,
  QuoteRequestStatus,
  SubmitQuoteDto,
} from '@factorymatch/shared';
import { ConflictError } from '../../common/errors/app-error.js';

@Injectable()
export class QuotesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a new quote request from an admin to a factory for a brief.
   * Enforces unique constraint on [briefId, factoryId].
   */
  async createQuoteRequest(briefId: string, factoryId: string, expiresAt: Date) {
    const existing = await this.prisma.quoteRequest.findUnique({
      where: {
        briefId_factoryId: { briefId, factoryId },
      },
    });

    if (existing) {
      throw new ConflictError('A quote request already exists for this factory and brief');
    }

    try {
      return await this.prisma.quoteRequest.create({
        data: {
          briefId,
          factoryId,
          expiresAt,
          status: QuoteRequestStatus.REQUESTED,
        },
        include: {
          brief: true,
          factory: true,
        },
      });
    } catch (err: any) {
      // Prisma P2002 is unique constraint violation
      if (err?.code === 'P2002') {
        throw new ConflictError('A quote request already exists for this factory and brief');
      }
      throw err;
    }
  }

  /**
   * Finds a quote request by ID with brief, factory, and quotes relations.
   */
  async findQuoteRequestById(id: string) {
    return this.prisma.quoteRequest.findUnique({
      where: { id },
      include: {
        brief: true,
        factory: true,
        quotes: true,
      },
    });
  }

  /**
   * Finds all quote requests for a brief.
   */
  async findQuoteRequestsByBriefId(briefId: string) {
    return this.prisma.quoteRequest.findMany({
      where: { briefId },
      include: {
        factory: true,
        quotes: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Finds quote requests for a factory with optional cursor pagination.
   * Protects brief data by selecting only relevant brand-safe fields.
   */
  async findQuoteRequestsByFactoryId(
    factoryId: string,
    pagination?: { cursor?: string; limit?: number },
  ) {
    const limit = pagination?.limit ?? 20;

    return this.prisma.quoteRequest.findMany({
      where: { factoryId },
      include: {
        brief: {
          select: {
            id: true,
            productName: true,
            quantityUnits: true,
            targetPricePaiseMin: true,
            targetPricePaiseMax: true,
            requirementsJson: true,
            timelineWeeks: true,
            status: true,
            createdAt: true,
          },
        },
        quotes: true,
      },
      take: limit,
      ...(pagination?.cursor ? { skip: 1, cursor: { id: pagination.cursor } } : {}),
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Creates a quote submitted by a factory.
   */
  async createQuote(quoteRequestId: string, dto: SubmitQuoteDto) {
    return this.prisma.quote.create({
      data: {
        quoteRequestId,
        pricePaisePerUnit: dto.pricePaisePerUnit,
        moqUnits: dto.moqUnits,
        leadTimeDays: dto.leadTimeDays,
        validUntil: new Date(dto.validUntil),
        termsJson: (dto.termsJson ?? {}) as any,
        status: QuoteStatus.SUBMITTED,
      },
      include: {
        quoteRequest: {
          include: {
            brief: true,
            factory: true,
          },
        },
      },
    });
  }

  /**
   * Finds a quote by ID with its quoteRequest, brief, and factory relations.
   */
  async findQuoteById(id: string) {
    return this.prisma.quote.findUnique({
      where: { id },
      include: {
        quoteRequest: {
          include: {
            brief: true,
            factory: true,
          },
        },
      },
    });
  }

  /**
   * Finds all quotes for a brief for the brand comparison view.
   * Joins factory details and orders by price ascending.
   */
  async findQuotesByBriefId(briefId: string) {
    return this.prisma.quote.findMany({
      where: {
        quoteRequest: {
          briefId,
        },
      },
      include: {
        quoteRequest: {
          include: {
            brief: true,
            factory: {
              select: {
                id: true,
                legalName: true,
                city: true,
                state: true,
                tier: true,
                status: true,
              },
            },
          },
        },
      },
      orderBy: [
        { pricePaisePerUnit: 'asc' },
        { createdAt: 'desc' },
      ],
    });
  }

  /**
   * Updates quote status.
   */
  async updateQuoteStatus(id: string, status: QuoteStatus) {
    return this.prisma.quote.update({
      where: { id },
      data: { status },
      include: {
        quoteRequest: {
          include: {
            brief: true,
            factory: true,
          },
        },
      },
    });
  }

  /**
   * Updates quote request status.
   */
  async updateQuoteRequestStatus(id: string, status: QuoteRequestStatus) {
    return this.prisma.quoteRequest.update({
      where: { id },
      data: { status },
    });
  }

  /**
   * Finds brief by ID with brand relation.
   */
  async findBriefById(briefId: string) {
    return this.prisma.brief.findUnique({
      where: { id: briefId },
      include: { brand: true },
    });
  }

  /**
   * Finds factory by ID.
   */
  async findFactoryById(factoryId: string) {
    return this.prisma.factory.findUnique({
      where: { id: factoryId },
    });
  }

  /**
   * Finds any currently accepted quote for a brief.
   */
  async findAcceptedQuoteForBrief(briefId: string) {
    return this.prisma.quote.findFirst({
      where: {
        quoteRequest: { briefId },
        status: QuoteStatus.ACCEPTED,
      },
      include: {
        quoteRequest: {
          include: {
            brief: true,
            factory: true,
          },
        },
      },
    });
  }

  /**
   * Atomic decision transaction:
   * When accepted: marks selected quote and its request as ACCEPTED,
   * and marks all other SUBMITTED quotes/requests for the brief as REJECTED.
   * When rejected: marks selected quote and its request as REJECTED.
   */
  async decideQuoteTransaction(quoteId: string, briefId: string, targetStatus: QuoteStatus) {
    return this.prisma.$transaction(async (tx) => {
      const quote = await tx.quote.update({
        where: { id: quoteId },
        data: { status: targetStatus },
        include: {
          quoteRequest: {
            include: {
              brief: true,
              factory: true,
            },
          },
        },
      });

      const requestTargetStatus =
        targetStatus === QuoteStatus.ACCEPTED
          ? QuoteRequestStatus.ACCEPTED
          : QuoteRequestStatus.REJECTED;

      await tx.quoteRequest.update({
        where: { id: quote.quoteRequestId },
        data: { status: requestTargetStatus },
      });

      // When one quote is ACCEPTED, reject all other submitted quotes for this brief
      if (targetStatus === QuoteStatus.ACCEPTED) {
        const otherQuotes = await tx.quote.findMany({
          where: {
            quoteRequest: { briefId },
            id: { not: quoteId },
            status: QuoteStatus.SUBMITTED,
          },
        });

        const otherQuoteIds = otherQuotes.map((q) => q.id);
        const otherRequestIds = otherQuotes.map((q) => q.quoteRequestId);

        if (otherQuoteIds.length > 0) {
          await tx.quote.updateMany({
            where: { id: { in: otherQuoteIds } },
            data: { status: QuoteStatus.REJECTED },
          });

          await tx.quoteRequest.updateMany({
            where: { id: { in: otherRequestIds } },
            data: { status: QuoteRequestStatus.REJECTED },
          });
        }
      }

      return quote;
    });
  }
}
