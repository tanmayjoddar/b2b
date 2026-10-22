import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReviewsService } from './reviews.service.js';
import { ReviewsRepository } from './reviews.repository.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { AuthUser, OrderStatus, Role, UserStatus } from '@factorymatch/shared';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('ReviewsService', () => {
  let service: ReviewsService;
  let repo: Partial<Record<keyof ReviewsRepository, any>>;
  let prisma: Partial<Record<keyof PrismaService, any>>;

  const mockBrandUser: AuthUser = {
    id: 'usr-brand-1',
    email: 'brand1@example.com',
    phone: null,
    role: Role.BRAND,
    status: UserStatus.ACTIVE,
    brandId: 'brand-1',
  };

  beforeEach(() => {
    repo = {
      findOrderForReview: vi.fn(),
      findByOrderId: vi.fn(),
      findByFactoryId: vi.fn(),
      createReview: vi.fn(),
    };

    prisma = {
      auditLog: {
        create: vi.fn().mockResolvedValue({ id: 'audit-1' }),
      } as any,
    };

    service = new ReviewsService(
      repo as unknown as ReviewsRepository,
      prisma as unknown as PrismaService,
    );
  });

  it('successfully creates review for completed order by brand owner', async () => {
    repo.findOrderForReview.mockResolvedValue({
      id: 'ord-1',
      brandId: 'brand-1',
      factoryId: 'factory-1',
      status: OrderStatus.COMPLETED,
    });
    repo.findByOrderId.mockResolvedValue(null);
    repo.createReview.mockResolvedValue({
      id: 'rev-1',
      orderId: 'ord-1',
      brandId: 'brand-1',
      factoryId: 'factory-1',
      onTimeRating: 5,
      qualityRating: 5,
      communicationRating: 4,
      comment: 'Excellent batch manufacturing!',
    });

    const result = await service.createReview(mockBrandUser, {
      orderId: 'ord-1',
      onTimeRating: 5,
      qualityRating: 5,
      communicationRating: 4,
      comment: 'Excellent batch manufacturing!',
    });

    expect(result.id).toBe('rev-1');
    expect(repo.createReview).toHaveBeenCalledTimes(1);
  });

  it('throws NotFoundException if order does not exist', async () => {
    repo.findOrderForReview.mockResolvedValue(null);

    await expect(
      service.createReview(mockBrandUser, {
        orderId: 'ord-unknown',
        onTimeRating: 5,
        qualityRating: 5,
        communicationRating: 5,
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws NotFoundException if order is not completed yet', async () => {
    repo.findOrderForReview.mockResolvedValue({
      id: 'ord-1',
      brandId: 'brand-1',
      factoryId: 'factory-1',
      status: OrderStatus.IN_PRODUCTION,
    });

    await expect(
      service.createReview(mockBrandUser, {
        orderId: 'ord-1',
        onTimeRating: 5,
        qualityRating: 5,
        communicationRating: 5,
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws ConflictException if review already exists for order', async () => {
    repo.findOrderForReview.mockResolvedValue({
      id: 'ord-1',
      brandId: 'brand-1',
      factoryId: 'factory-1',
      status: OrderStatus.COMPLETED,
    });
    repo.findByOrderId.mockResolvedValue({ id: 'rev-existing' });

    await expect(
      service.createReview(mockBrandUser, {
        orderId: 'ord-1',
        onTimeRating: 5,
        qualityRating: 5,
        communicationRating: 5,
      }),
    ).rejects.toThrow(ConflictException);
  });
});
