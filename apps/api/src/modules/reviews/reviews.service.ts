import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { AuthUser, CreateReviewDto, OrderStatus } from '@factorymatch/shared';
import { ReviewsRepository } from './reviews.repository.js';
import { canCreateReview } from './reviews.policy.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(
    private readonly repo: ReviewsRepository,
    private readonly prisma: PrismaService,
  ) {}

  async createReview(user: AuthUser, dto: CreateReviewDto) {
    const order = await this.repo.findOrderForReview(dto.orderId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (!canCreateReview(user, {
      id: order.id,
      brandId: order.brandId,
      factoryId: order.factoryId,
      status: order.status as OrderStatus,
    })) {
      // 404 to avoid IDOR existence disclosure if not owner or not completed
      throw new NotFoundException('Order not found or not eligible for review');
    }

    // Check if review already exists
    const existing = await this.repo.findByOrderId(order.id);
    if (existing) {
      throw new ConflictException('A review has already been submitted for this order');
    }

    const review = await this.repo.createReview(
      order.brandId,
      order.factoryId,
      order.id,
      dto,
    );

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        actorUserId: user.id,
        action: 'REVIEW_CREATED',
        entityType: 'Review',
        entityId: review.id,
        afterJson: review as any,
      },
    }).catch((err) => {
      this.logger.warn(`Failed to write audit log for review ${review.id}: ${err.message}`);
    });

    this.logger.log(`Review ${review.id} created for order ${order.id} by brand ${order.brandId}`);
    return review;
  }

  async getReviewsForFactory(factoryId: string, limit = 20, offset = 0) {
    return this.repo.findByFactoryId(factoryId, limit, offset);
  }
}
