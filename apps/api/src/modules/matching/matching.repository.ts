import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { BriefStatus } from '@factorymatch/shared';

@Injectable()
export class MatchingRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a shortlist with items for a brief and transitions the brief status to SHORTLISTED.
   * Runs atomically within a transaction.
   */
  async createShortlist(
    briefId: string,
    adminId: string,
    factoryIds: string[],
    notes?: Record<string, string>,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const shortlist = await tx.shortlist.create({
        data: {
          briefId,
          createdByAdminId: adminId,
          items: {
            create: factoryIds.map((factoryId, index) => ({
              factoryId,
              rank: index + 1,
              adminNote: notes?.[factoryId] ?? null,
            })),
          },
        },
        include: {
          items: {
            orderBy: { rank: 'asc' },
            include: {
              factory: {
                include: {
                  capabilities: true,
                  certificates: true,
                },
              },
            },
          },
          brief: true,
        },
      });

      // Transition the brief to SHORTLISTED status
      await tx.brief.update({
        where: { id: briefId },
        data: { status: BriefStatus.SHORTLISTED },
      });

      return shortlist;
    });
  }

  /**
   * Finds shortlist for a brief with all items and factory details.
   */
  async findShortlistByBriefId(briefId: string) {
    return this.prisma.shortlist.findFirst({
      where: {
        briefId,
        brief: {
          deletedAt: null,
        },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          orderBy: { rank: 'asc' },
          include: {
            factory: {
              include: {
                capabilities: true,
                certificates: true,
              },
            },
          },
        },
        brief: true,
      },
    });
  }

  /**
   * Retrieves shortlist for a brand ensuring strict tenant ownership in the query.
   */
  async getShortlistForBrand(briefId: string, brandId: string) {
    return this.prisma.shortlist.findFirst({
      where: {
        briefId,
        brief: {
          brandId,
          deletedAt: null,
        },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          orderBy: { rank: 'asc' },
          include: {
            factory: {
              include: {
                capabilities: true,
                certificates: true,
              },
            },
          },
        },
        brief: true,
      },
    });
  }
}
