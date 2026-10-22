import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BriefsService } from './briefs.service.js';
import { BriefsRepository } from './briefs.repository.js';
import {
  AuthUser,
  BriefStatus,
  CreateBriefDto,
  Role,
  UpdateBriefDto,
  UserStatus,
} from '@factorymatch/shared';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../common/errors/app-error.js';

describe('BriefsService', () => {
  let service: BriefsService;
  let mockRepo: any;

  const brandUser1: AuthUser = {
    id: 'usr-brand-1',
    email: 'brand1@example.com',
    phone: null,
    role: Role.BRAND,
    status: UserStatus.ACTIVE,
    brandId: 'brand-1',
    factoryId: null,
  };

  const brandUser2: AuthUser = {
    id: 'usr-brand-2',
    email: 'brand2@example.com',
    phone: null,
    role: Role.BRAND,
    status: UserStatus.ACTIVE,
    brandId: 'brand-2',
    factoryId: null,
  };

  const adminUser: AuthUser = {
    id: 'usr-admin-1',
    email: 'admin@factorymatch.com',
    phone: null,
    role: Role.ADMIN,
    status: UserStatus.ACTIVE,
    brandId: null,
    factoryId: null,
  };

  const factoryUser1: AuthUser = {
    id: 'usr-factory-1',
    email: null,
    phone: '+919876543210',
    role: Role.FACTORY,
    status: UserStatus.ACTIVE,
    brandId: null,
    factoryId: 'factory-1',
  };

  const mockBrief = {
    id: 'brief-100',
    brandId: 'brand-1',
    verticalId: 'vertical-1',
    productName: 'Roasted Seeds 200g',
    quantityUnits: 5000,
    targetPricePaiseMin: 8000,
    targetPricePaiseMax: 10000,
    requirementsJson: {},
    timelineWeeks: 4,
    status: BriefStatus.DRAFT,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    shortlists: [
      {
        items: [
          { factoryId: 'factory-1' },
        ],
      },
    ],
  };

  beforeEach(() => {
    mockRepo = {
      create: vi.fn(),
      findById: vi.fn(),
      findByBrandId: vi.fn(),
      findByFactoryId: vi.fn(),
      update: vi.fn(),
      updateStatus: vi.fn(),
      listAll: vi.fn(),
    };

    service = new BriefsService(mockRepo as unknown as BriefsRepository);
  });

  describe('create', () => {
    const createDto: CreateBriefDto = {
      verticalId: 'vertical-1',
      productName: 'Roasted Seeds 200g',
      quantityUnits: 5000,
      targetPricePaiseMin: 8000,
      targetPricePaiseMax: 10000,
      requirementsJson: {},
      timelineWeeks: 4,
    };

    it('creates brief with brandId from authenticated session and DRAFT status', async () => {
      mockRepo.create.mockResolvedValue(mockBrief);

      const result = await service.create(brandUser1, createDto);

      expect(mockRepo.create).toHaveBeenCalledWith('brand-1', createDto);
      expect(result.id).toBe('brief-100');
    });

    it('rejects creation if user has no brandId with ForbiddenError', async () => {
      const userWithoutBrand: AuthUser = {
        ...brandUser1,
        brandId: null,
      };

      await expect(service.create(userWithoutBrand, createDto)).rejects.toThrow(
        ForbiddenError,
      );
      expect(mockRepo.create).not.toHaveBeenCalled();
    });

    it('rejects creation if user is not BRAND role', async () => {
      await expect(service.create(adminUser, createDto)).rejects.toThrow(
        ForbiddenError,
      );
      expect(mockRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('getForUser', () => {
    it('returns brief for owning brand', async () => {
      mockRepo.findById.mockResolvedValue(mockBrief);

      const result = await service.getForUser(brandUser1, 'brief-100');
      expect(result.id).toBe('brief-100');
    });

    it('throws NotFoundError (404) for nonexistent brief', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.getForUser(brandUser1, 'nonexistent')).rejects.toThrow(
        NotFoundError,
      );
    });

    it('throws NotFoundError (404, not 403) for another brand (cross-tenant access denial)', async () => {
      mockRepo.findById.mockResolvedValue(mockBrief);

      await expect(service.getForUser(brandUser2, 'brief-100')).rejects.toThrow(
        NotFoundError,
      );
    });

    it('allows admin to view any brief', async () => {
      mockRepo.findById.mockResolvedValue(mockBrief);

      const result = await service.getForUser(adminUser, 'brief-100');
      expect(result.id).toBe('brief-100');
    });

    it('allows shortlisted factory to view brief', async () => {
      mockRepo.findById.mockResolvedValue(mockBrief);

      const result = await service.getForUser(factoryUser1, 'brief-100');
      expect(result.id).toBe('brief-100');
    });

    it('throws NotFoundError for non-shortlisted factory', async () => {
      mockRepo.findById.mockResolvedValue(mockBrief);
      const otherFactory: AuthUser = {
        ...factoryUser1,
        id: 'usr-fac-99',
        factoryId: 'factory-99',
      };

      await expect(service.getForUser(otherFactory, 'brief-100')).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe('listForUser', () => {
    it('calls listAll for admin', async () => {
      mockRepo.listAll.mockResolvedValue([mockBrief]);

      const result = await service.listForUser(adminUser);
      expect(mockRepo.listAll).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });

    it('calls findByBrandId with user.brandId for brand', async () => {
      mockRepo.findByBrandId.mockResolvedValue([mockBrief]);

      const result = await service.listForUser(brandUser1);
      expect(mockRepo.findByBrandId).toHaveBeenCalledWith('brand-1', undefined);
      expect(result).toHaveLength(1);
    });

    it('returns empty list if brand user has no brandId', async () => {
      const userWithoutBrand: AuthUser = { ...brandUser1, brandId: null };
      const result = await service.listForUser(userWithoutBrand);
      expect(result).toEqual([]);
      expect(mockRepo.findByBrandId).not.toHaveBeenCalled();
    });

    it('calls findByFactoryId for factory', async () => {
      mockRepo.findByFactoryId.mockResolvedValue([mockBrief]);

      const result = await service.listForUser(factoryUser1);
      expect(mockRepo.findByFactoryId).toHaveBeenCalledWith('factory-1', undefined);
      expect(result).toHaveLength(1);
    });
  });

  describe('update', () => {
    const updateDto: UpdateBriefDto = {
      productName: 'Roasted Seeds 250g',
    };

    it('updates draft brief for owning brand', async () => {
      mockRepo.findById.mockResolvedValue(mockBrief);
      mockRepo.update.mockResolvedValue({
        ...mockBrief,
        productName: 'Roasted Seeds 250g',
      });

      const result = await service.update(brandUser1, 'brief-100', updateDto);
      expect(result.productName).toBe('Roasted Seeds 250g');
      expect(mockRepo.update).toHaveBeenCalledWith('brief-100', updateDto);
    });

    it('throws NotFoundError when updating nonexistent brief', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.update(brandUser1, 'nonexistent', updateDto)).rejects.toThrow(
        NotFoundError,
      );
    });

    it('throws NotFoundError when updating another brand brief', async () => {
      mockRepo.findById.mockResolvedValue(mockBrief);

      await expect(service.update(brandUser2, 'brief-100', updateDto)).rejects.toThrow(
        NotFoundError,
      );
      expect(mockRepo.update).not.toHaveBeenCalled();
    });

    it('throws ConflictError when updating non-draft brief', async () => {
      mockRepo.findById.mockResolvedValue({
        ...mockBrief,
        status: BriefStatus.SUBMITTED,
      });

      await expect(service.update(brandUser1, 'brief-100', updateDto)).rejects.toThrow(
        ConflictError,
      );
      expect(mockRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('submit', () => {
    it('submits draft brief and transitions status to SUBMITTED', async () => {
      mockRepo.findById.mockResolvedValue(mockBrief);
      mockRepo.updateStatus.mockResolvedValue({
        ...mockBrief,
        status: BriefStatus.SUBMITTED,
      });

      const result = await service.submit(brandUser1, 'brief-100');
      expect(mockRepo.updateStatus).toHaveBeenCalledWith('brief-100', BriefStatus.SUBMITTED);
      expect(result.status).toBe(BriefStatus.SUBMITTED);
    });

    it('throws NotFoundError when submitting nonexistent brief', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.submit(brandUser1, 'nonexistent')).rejects.toThrow(
        NotFoundError,
      );
    });

    it('throws NotFoundError when submitting another brand brief', async () => {
      mockRepo.findById.mockResolvedValue(mockBrief);

      await expect(service.submit(brandUser2, 'brief-100')).rejects.toThrow(
        NotFoundError,
      );
    });

    it('throws ConflictError when submitting already SUBMITTED brief', async () => {
      mockRepo.findById.mockResolvedValue({
        ...mockBrief,
        status: BriefStatus.SUBMITTED,
      });

      await expect(service.submit(brandUser1, 'brief-100')).rejects.toThrow(
        ConflictError,
      );
      expect(mockRepo.updateStatus).not.toHaveBeenCalled();
    });
  });

  describe('cancel', () => {
    it('allows owning brand to cancel active brief', async () => {
      mockRepo.findById.mockResolvedValue(mockBrief);
      mockRepo.updateStatus.mockResolvedValue({
        ...mockBrief,
        status: BriefStatus.CANCELLED,
      });

      const result = await service.cancel(brandUser1, 'brief-100');
      expect(mockRepo.updateStatus).toHaveBeenCalledWith('brief-100', BriefStatus.CANCELLED);
      expect(result.status).toBe(BriefStatus.CANCELLED);
    });

    it('allows admin to cancel active brief', async () => {
      mockRepo.findById.mockResolvedValue({
        ...mockBrief,
        status: BriefStatus.MATCHING,
      });
      mockRepo.updateStatus.mockResolvedValue({
        ...mockBrief,
        status: BriefStatus.CANCELLED,
      });

      const result = await service.cancel(adminUser, 'brief-100');
      expect(mockRepo.updateStatus).toHaveBeenCalledWith('brief-100', BriefStatus.CANCELLED);
      expect(result.status).toBe(BriefStatus.CANCELLED);
    });

    it('throws NotFoundError when cancelling another brand brief', async () => {
      mockRepo.findById.mockResolvedValue(mockBrief);

      await expect(service.cancel(brandUser2, 'brief-100')).rejects.toThrow(
        NotFoundError,
      );
    });

    it('throws ConflictError when cancelling already CLOSED brief', async () => {
      mockRepo.findById.mockResolvedValue({
        ...mockBrief,
        status: BriefStatus.CLOSED,
      });

      await expect(service.cancel(brandUser1, 'brief-100')).rejects.toThrow(
        ConflictError,
      );
      expect(mockRepo.updateStatus).not.toHaveBeenCalled();
    });

    it('throws ConflictError when cancelling already CANCELLED brief', async () => {
      mockRepo.findById.mockResolvedValue({
        ...mockBrief,
        status: BriefStatus.CANCELLED,
      });

      await expect(service.cancel(brandUser1, 'brief-100')).rejects.toThrow(
        ConflictError,
      );
      expect(mockRepo.updateStatus).not.toHaveBeenCalled();
    });
  });
});
