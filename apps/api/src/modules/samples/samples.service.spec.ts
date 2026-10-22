import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SamplesService } from './samples.service.js';
import { SamplesRepository } from './samples.repository.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import {
  AuthUser,
  Role,
  UserStatus,
  SampleStatus,
} from '@factorymatch/shared';
import {
  ConflictError,
  NotFoundError,
  ForbiddenError,
} from '../../common/errors/app-error.js';

describe('SamplesService', () => {
  let service: SamplesService;
  let mockRepo: any;
  let mockPrisma: any;

  const brandUserA: AuthUser = {
    id: 'usr-brand-a',
    email: 'brand-a@test.com',
    phone: null,
    role: Role.BRAND,
    status: UserStatus.ACTIVE,
    brandId: 'brand-111',
    factoryId: null,
  };

  const brandUserB: AuthUser = {
    id: 'usr-brand-b',
    email: 'brand-b@test.com',
    phone: null,
    role: Role.BRAND,
    status: UserStatus.ACTIVE,
    brandId: 'brand-222',
    factoryId: null,
  };

  const factoryUserA: AuthUser = {
    id: 'usr-factory-a',
    email: null,
    phone: '+919876543210',
    role: Role.FACTORY,
    status: UserStatus.ACTIVE,
    brandId: null,
    factoryId: 'factory-aaa',
  };

  const factoryUserB: AuthUser = {
    id: 'usr-factory-b',
    email: null,
    phone: '+919876543211',
    role: Role.FACTORY,
    status: UserStatus.ACTIVE,
    brandId: null,
    factoryId: 'factory-bbb',
  };

  const adminUser: AuthUser = {
    id: 'usr-admin',
    email: 'admin@factorymatch.in',
    phone: null,
    role: Role.ADMIN,
    status: UserStatus.ACTIVE,
    brandId: null,
    factoryId: null,
  };

  beforeEach(() => {
    mockRepo = {
      create: vi.fn(),
      findById: vi.fn(),
      findByBriefAndFactory: vi.fn(),
      findByBrandId: vi.fn(),
      findByFactoryId: vi.fn(),
      findAll: vi.fn(),
      lockAndFindById: vi.fn(),
      updateStatus: vi.fn(),
      findBriefById: vi.fn(),
      findFactoryById: vi.fn(),
    };

    mockPrisma = {
      $transaction: vi.fn(async (cb) => cb(mockRepo)),
    };

    service = new SamplesService(
      mockRepo as unknown as SamplesRepository,
      mockPrisma as unknown as PrismaService,
    );
  });

  describe('createSample', () => {
    const validBrief = {
      id: 'brief-10',
      brandId: 'brand-111',
    };

    const validFactory = {
      id: 'factory-aaa',
    };

    it('allows brand owner to create sample request', async () => {
      mockRepo.findBriefById.mockResolvedValue(validBrief);
      mockRepo.findFactoryById.mockResolvedValue(validFactory);
      mockRepo.findByBriefAndFactory.mockResolvedValue(null);
      const createdSample = {
        id: 'smp-1',
        briefId: 'brief-10',
        factoryId: 'factory-aaa',
        status: SampleStatus.REQUESTED,
      };
      mockRepo.create.mockResolvedValue(createdSample);

      const result = await service.createSample(brandUserA, {
        briefId: 'brief-10',
        factoryId: 'factory-aaa',
      });

      expect(result).toEqual(createdSample);
      expect(mockRepo.create).toHaveBeenCalledWith('brief-10', 'factory-aaa');
    });

    it('rejects foreign brand brief with NotFoundError (404)', async () => {
      mockRepo.findBriefById.mockResolvedValue(validBrief);

      await expect(
        service.createSample(brandUserB, {
          briefId: 'brief-10',
          factoryId: 'factory-aaa',
        }),
      ).rejects.toThrow(NotFoundError);
    });

    it('rejects duplicate active sample request with ConflictError', async () => {
      mockRepo.findBriefById.mockResolvedValue(validBrief);
      mockRepo.findFactoryById.mockResolvedValue(validFactory);
      mockRepo.findByBriefAndFactory.mockResolvedValue({
        id: 'smp-existing',
        status: SampleStatus.REQUESTED,
      });

      await expect(
        service.createSample(brandUserA, {
          briefId: 'brief-10',
          factoryId: 'factory-aaa',
        }),
      ).rejects.toThrow(ConflictError);
    });

    it('allows new sample if previous was REJECTED', async () => {
      mockRepo.findBriefById.mockResolvedValue(validBrief);
      mockRepo.findFactoryById.mockResolvedValue(validFactory);
      mockRepo.findByBriefAndFactory.mockResolvedValue({
        id: 'smp-rejected',
        status: SampleStatus.REJECTED,
      });
      mockRepo.create.mockResolvedValue({ id: 'smp-new', status: SampleStatus.REQUESTED });

      const result = await service.createSample(brandUserA, {
        briefId: 'brief-10',
        factoryId: 'factory-aaa',
      });

      expect(result.id).toBe('smp-new');
    });

    it('rejects sample creation from factory user with ForbiddenError', async () => {
      await expect(
        service.createSample(factoryUserA, {
          briefId: 'brief-10',
          factoryId: 'factory-aaa',
        }),
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('transition', () => {
    const requestedSample = {
      id: 'smp-1',
      briefId: 'brief-10',
      factoryId: 'factory-aaa',
      status: SampleStatus.REQUESTED,
      brief: { brandId: 'brand-111' },
    };

    it('allows factory to dispatch sample with tracking reference', async () => {
      mockRepo.lockAndFindById.mockResolvedValue(requestedSample);
      const updated = {
        ...requestedSample,
        status: SampleStatus.DISPATCHED,
        trackingRef: 'TRACK-123456',
      };
      mockRepo.updateStatus.mockResolvedValue(updated);

      const result = await service.transition(
        factoryUserA,
        'smp-1',
        SampleStatus.DISPATCHED,
        'TRACK-123456',
      );

      expect(result.status).toBe(SampleStatus.DISPATCHED);
      expect(mockRepo.updateStatus).toHaveBeenCalledWith(
        expect.anything(),
        'smp-1',
        SampleStatus.DISPATCHED,
        'TRACK-123456',
        undefined,
      );
    });

    it('allows brand to receive and approve sample with feedback', async () => {
      const receivedSample = {
        ...requestedSample,
        status: SampleStatus.RECEIVED,
      };
      mockRepo.lockAndFindById.mockResolvedValue(receivedSample);
      const updated = {
        ...receivedSample,
        status: SampleStatus.APPROVED,
        brandFeedback: 'Taste and packaging meet specifications',
      };
      mockRepo.updateStatus.mockResolvedValue(updated);

      const result = await service.transition(
        brandUserA,
        'smp-1',
        SampleStatus.APPROVED,
        undefined,
        'Taste and packaging meet specifications',
      );

      expect(result.status).toBe(SampleStatus.APPROVED);
    });

    it('throws ConflictError on illegal state transition (REQUESTED -> APPROVED)', async () => {
      mockRepo.lockAndFindById.mockResolvedValue(requestedSample);

      await expect(
        service.transition(adminUser, 'smp-1', SampleStatus.APPROVED),
      ).rejects.toThrow(ConflictError);
    });

    it('throws ForbiddenError when factory tries to approve sample', async () => {
      const receivedSample = {
        ...requestedSample,
        status: SampleStatus.RECEIVED,
      };
      mockRepo.lockAndFindById.mockResolvedValue(receivedSample);

      await expect(
        service.transition(factoryUserA, 'smp-1', SampleStatus.APPROVED),
      ).rejects.toThrow(ForbiddenError);
    });

    it('denies foreign brand transition with NotFoundError (404)', async () => {
      mockRepo.lockAndFindById.mockResolvedValue(requestedSample);

      await expect(
        service.transition(brandUserB, 'smp-1', SampleStatus.RECEIVED),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('getForUser', () => {
    const sample = {
      id: 'smp-1',
      briefId: 'brief-10',
      factoryId: 'factory-aaa',
      status: SampleStatus.REQUESTED,
      brief: { brandId: 'brand-111' },
    };

    it('allows authorized brand to view sample', async () => {
      mockRepo.findById.mockResolvedValue(sample);
      const result = await service.getForUser(brandUserA, 'smp-1');
      expect(result).toEqual(sample);
    });

    it('denies foreign brand with NotFoundError (404)', async () => {
      mockRepo.findById.mockResolvedValue(sample);
      await expect(service.getForUser(brandUserB, 'smp-1')).rejects.toThrow(
        NotFoundError,
      );
    });
  });
});
