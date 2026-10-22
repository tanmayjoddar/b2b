import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { CreateReviewDto } from '@factorymatch/shared';

@Injectable()
export class ReviewsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findOrderForReview(orderId: string) {
    return this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        brand: true,
        factory: true,
        reviews: true,
      },
    });
  }

  async findByOrderId(orderId: string) {
    return this.prisma.review.findUnique({
      where: { orderId },
      include: {
        brand: {
          select: {
            id: true,
            companyName: true,
          },
        },
      },
    });
  }

  async findByFactoryId(factoryId: string, limit = 20, offset = 0) {
    return this.prisma.review.findMany({
      where: { factoryId },
      include: {
        brand: {
          select: {
            id: true,
            companyName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  async createReview(
    brandId: string,
    factoryId: string,
    orderId: string,
    dto: CreateReviewDto,
  ) {
    return this.prisma.review.create({
      data: {
        brandId,
        factoryId,
        orderId,
        onTimeRating: dto.onTimeRating,
        qualityRating: dto.qualityRating,
        communicationRating: dto.communicationRating,
        comment: dto.comment,
      },
      include: {
        brand: {
          select: {
            id: true,
            companyName: true,
          },
        },
      },
    });
  }
}
