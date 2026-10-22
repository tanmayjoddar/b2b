import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  AuthUser,
  FactoryStatus,
  Role,
  VerificationMethod,
  VerificationResult,
  VerificationTier,
} from '@factorymatch/shared';
import { VerificationService } from './verification.service.js';
import { VerificationRepository } from './verification.repository.js';
import { ForbiddenError, NotFoundError } from '../../common/errors/app-error.js';

describe('VerificationService', () => {
  let service: VerificationService;
  let mockRepo: any;

  const adminUser: AuthUser = {
    id: 'admin-user-1',
    email: 'admin@factorymatch.in',
    phone: null,
    role: Role.ADMIN,
    status: 'ACTIVE' as any,
  };

  const factoryUser: AuthUser = {
    id: 'factory-user-1',
    email: null,
    phone: '+919876543210',
    role: Role.FACTORY,
    status: 'ACTIVE' as any,
    factoryId: 'fac-1',
  };

  const brandUser: AuthUser = {
    id: 'brand-user-1',
    email: 'brand@example.com',
    phone: null,
    role: Role.BRAND,
    status: 'ACTIVE' as any,
    brandId: 'brd-1',
  };

  const mockFactory = {
    id: 'fac-1',
    legalName: 'Apex Foods Ltd',
    status: FactoryStatus.PENDING,
    tier: VerificationTier.TIER_1_DOCUMENTS,
  };

  beforeEach(() => {
    mockRepo = {
      findFactoryById: vi.fn(),
      createVerification: vi.fn(),
      findByFactoryId: vi.fn(),
      executeVerificationTx: vi.fn(),
    };

    service = new VerificationService(mockRepo as unknown as VerificationRepository);
  });

  describe('verifyFactory', () => {
    const verifyDto = {
      tier: VerificationTier.TIER_2_VIDEO,
      method: VerificationMethod.VIDEO,
      result: VerificationResult.PASSED,
      notes: 'Completed factory video walkthrough successfully',
      evidenceFileId: 'file-evidence-1',
      newStatus: FactoryStatus.ACTIVE,
    };

    it('successfully executes verification transaction by ADMIN', async () => {
      mockRepo.findFactoryById.mockResolvedValue(mockFactory);
      mockRepo.executeVerificationTx.mockResolvedValue({
        verification: {
          id: 'ver-1',
          factoryId: 'fac-1',
          tier: verifyDto.tier,
          method: verifyDto.method,
          result: verifyDto.result,
        },
        factory: {
          ...mockFactory,
          tier: verifyDto.tier,
          status: verifyDto.newStatus,
        },
        auditLog: {
          id: 'audit-1',
          action: 'FACTORY_VERIFIED',
        },
      });

      const result = await service.verifyFactory(adminUser, 'fac-1', verifyDto);

      expect(mockRepo.findFactoryById).toHaveBeenCalledWith('fac-1');
      expect(mockRepo.executeVerificationTx).toHaveBeenCalledWith({
        factoryId: 'fac-1',
        dto: verifyDto,
        adminId: adminUser.id,
        beforeFactory: {
          status: FactoryStatus.PENDING,
          tier: VerificationTier.TIER_1_DOCUMENTS,
        },
      });
      expect(result.verification.id).toBe('ver-1');
      expect(result.factory.tier).toBe(VerificationTier.TIER_2_VIDEO);
      expect(result.factory.status).toBe(FactoryStatus.ACTIVE);
    });

    it('rejects non-admin role with ForbiddenError', async () => {
      await expect(service.verifyFactory(factoryUser, 'fac-1', verifyDto)).rejects.toThrow(
        ForbiddenError,
      );
      await expect(service.verifyFactory(brandUser, 'fac-1', verifyDto)).rejects.toThrow(
        ForbiddenError,
      );
      expect(mockRepo.executeVerificationTx).not.toHaveBeenCalled();
    });

    it('throws NotFoundError when factory does not exist', async () => {
      mockRepo.findFactoryById.mockResolvedValue(null);

      await expect(
        service.verifyFactory(adminUser, 'non-existent-fac', verifyDto),
      ).rejects.toThrow(NotFoundError);
      expect(mockRepo.executeVerificationTx).not.toHaveBeenCalled();
    });
  });

  describe('getVerifications', () => {
    it('returns verification history for ADMIN', async () => {
      mockRepo.findFactoryById.mockResolvedValue(mockFactory);
      mockRepo.findByFactoryId.mockResolvedValue([
        {
          id: 'ver-1',
          factoryId: 'fac-1',
          tier: VerificationTier.TIER_2_VIDEO,
          result: VerificationResult.PASSED,
        },
      ]);

      const history = await service.getVerifications(adminUser, 'fac-1');

      expect(history).toHaveLength(1);
      expect(history[0].id).toBe('ver-1');
      expect(mockRepo.findByFactoryId).toHaveBeenCalledWith('fac-1');
    });

    it('rejects non-admin role with ForbiddenError', async () => {
      await expect(service.getVerifications(factoryUser, 'fac-1')).rejects.toThrow(ForbiddenError);
      await expect(service.getVerifications(brandUser, 'fac-1')).rejects.toThrow(ForbiddenError);
    });

    it('throws NotFoundError if factory does not exist', async () => {
      mockRepo.findFactoryById.mockResolvedValue(null);

      await expect(service.getVerifications(adminUser, 'non-existent-fac')).rejects.toThrow(
        NotFoundError,
      );
    });
  });
});
