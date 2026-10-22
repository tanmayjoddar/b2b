import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MatchingService } from './matching.service.js';
import { MatchingRepository } from './matching.repository.js';
import { BriefsService } from '../briefs/briefs.service.js';
import {
  AuthUser,
  BriefStatus,
  CreateShortlistDto,
  Role,
  UserStatus,
} from '@factorymatch/shared';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../common/errors/app-error.js';

describe('MatchingService', () => {
  let service: MatchingService;
  let mockMatchingRepo: any;
  let mockBriefsService: any;

  const adminUser: AuthUser = {
    id: 'usr-admin-1',
    email: 'admin@factorymatch.com',
    phone: null,
    role: Role.ADMIN,
    status: UserStatus.ACTIVE,
    brandId: null,
    factoryId: null,
  };

  const brandUser1: AuthUser = {
    id: 'usr-brand-1',
    email: 'brand1@example.com',
    phone: null,
    role: Role.BRAND,
    status: UserStatus.ACTIVE,
    brandId: 'brand-1',
    factoryId: null,
  };

  const factoryUser: AuthUser = {
    id: 'usr-factory-1',
    email: null,
    phone: '+919876543210',
    role: Role.FACTORY,
    status: UserStatus.ACTIVE,
    brandId: null,
    factoryId: 'factory-1',
  };

  const mockBrief = {
    id: 'brief-1',
    brandId: 'brand-1',
    productName: 'Protein Bars 60g',
    status: BriefStatus.SUBMITTED,
  };

  const mockShortlist = {
    id: 'shortlist-1',
    briefId: 'brief-1',
    createdByAdminId: 'usr-admin-1',
    items: [
      { id: 'item-1', factoryId: 'factory-1', rank: 1, adminNote: 'Top candidate' },
      { id: 'item-2', factoryId: 'factory-2', rank: 2, adminNote: 'Backup candidate' },
    ],
  };

  beforeEach(() => {
    mockMatchingRepo = {
      createShortlist: vi.fn(),
      findShortlistByBriefId: vi.fn(),
      getShortlistForBrand: vi.fn(),
    };

    mockBriefsService = {
      findById: vi.fn(),
    };

    service = new MatchingService(
      mockMatchingRepo as unknown as MatchingRepository,
      mockBriefsService as unknown as BriefsService,
    );
  });

  describe('createShortlist', () => {
    const dto: CreateShortlistDto = {
      briefId: 'brief-1',
      factoryIds: ['factory-1', 'factory-2'],
      notes: { 'factory-1': 'Top candidate' },
    };

    it('successfully creates shortlist when brief is in SUBMITTED status', async () => {
      mockBriefsService.findById.mockResolvedValue(mockBrief);
      mockMatchingRepo.createShortlist.mockResolvedValue(mockShortlist);

      const result = await service.createShortlist(adminUser, dto);

      expect(mockBriefsService.findById).toHaveBeenCalledWith('brief-1');
      expect(mockMatchingRepo.createShortlist).toHaveBeenCalledWith(
        'brief-1',
        'usr-admin-1',
        dto.factoryIds,
        dto.notes,
      );
      expect(result.id).toBe('shortlist-1');
    });

    it('successfully creates shortlist when brief is in MATCHING status', async () => {
      mockBriefsService.findById.mockResolvedValue({
        ...mockBrief,
        status: BriefStatus.MATCHING,
      });
      mockMatchingRepo.createShortlist.mockResolvedValue(mockShortlist);

      const result = await service.createShortlist(adminUser, dto);
      expect(result.id).toBe('shortlist-1');
    });

    it('rejects creation if user is not admin with ForbiddenError', async () => {
      await expect(service.createShortlist(brandUser1, dto)).rejects.toThrow(
        ForbiddenError,
      );
      expect(mockMatchingRepo.createShortlist).not.toHaveBeenCalled();
    });

    it('rejects creation if brief is not found with NotFoundError', async () => {
      mockBriefsService.findById.mockResolvedValue(null);

      await expect(service.createShortlist(adminUser, dto)).rejects.toThrow(
        NotFoundError,
      );
      expect(mockMatchingRepo.createShortlist).not.toHaveBeenCalled();
    });

    it('rejects creation if brief is still in DRAFT status with ConflictError', async () => {
      mockBriefsService.findById.mockResolvedValue({
        ...mockBrief,
        status: BriefStatus.DRAFT,
      });

      await expect(service.createShortlist(adminUser, dto)).rejects.toThrow(
        ConflictError,
      );
      expect(mockMatchingRepo.createShortlist).not.toHaveBeenCalled();
    });

    it('rejects creation if brief is in CANCELLED status with ConflictError', async () => {
      mockBriefsService.findById.mockResolvedValue({
        ...mockBrief,
        status: BriefStatus.CANCELLED,
      });

      await expect(service.createShortlist(adminUser, dto)).rejects.toThrow(
        ConflictError,
      );
      expect(mockMatchingRepo.createShortlist).not.toHaveBeenCalled();
    });
  });

  describe('getShortlistForUser', () => {
    it('allows admin to get shortlist for any brief', async () => {
      mockMatchingRepo.findShortlistByBriefId.mockResolvedValue(mockShortlist);

      const result = await service.getShortlistForUser(adminUser, 'brief-1');
      expect(mockMatchingRepo.findShortlistByBriefId).toHaveBeenCalledWith('brief-1');
      expect(result.id).toBe('shortlist-1');
    });

    it('throws NotFoundError when admin requests nonexistent shortlist', async () => {
      mockMatchingRepo.findShortlistByBriefId.mockResolvedValue(null);

      await expect(
        service.getShortlistForUser(adminUser, 'nonexistent'),
      ).rejects.toThrow(NotFoundError);
    });

    it('allows owning brand to get shortlist for their brief', async () => {
      mockMatchingRepo.getShortlistForBrand.mockResolvedValue(mockShortlist);

      const result = await service.getShortlistForUser(brandUser1, 'brief-1');
      expect(mockMatchingRepo.getShortlistForBrand).toHaveBeenCalledWith('brief-1', 'brand-1');
      expect(result.id).toBe('shortlist-1');
    });

    it('throws NotFoundError (404) when brand accesses another brand shortlist', async () => {
      mockMatchingRepo.getShortlistForBrand.mockResolvedValue(null);

      await expect(
        service.getShortlistForUser(brandUser1, 'other-brand-brief'),
      ).rejects.toThrow(NotFoundError);
    });

    it('throws ForbiddenError when brand has no brandId', async () => {
      const userWithoutBrand: AuthUser = { ...brandUser1, brandId: null };

      await expect(
        service.getShortlistForUser(userWithoutBrand, 'brief-1'),
      ).rejects.toThrow(ForbiddenError);
    });

    it('throws ForbiddenError when factory user requests shortlist', async () => {
      await expect(
        service.getShortlistForUser(factoryUser, 'brief-1'),
      ).rejects.toThrow(ForbiddenError);
    });
  });
});
