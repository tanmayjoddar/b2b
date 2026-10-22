import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  AuthUser,
  CertificateStatus,
  CertificateType,
  FactoryStatus,
  Role,
  VerificationTier,
} from '@factorymatch/shared';
import { FactoriesService } from './factories.service.js';
import { FactoriesRepository } from './factories.repository.js';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../common/errors/app-error.js';

describe('FactoriesService', () => {
  let service: FactoriesService;
  let mockRepo: any;

  const ownerUser: AuthUser = {
    id: 'user-fac-1',
    email: null,
    phone: '+919876543210',
    role: Role.FACTORY,
    status: 'ACTIVE' as any,
    factoryId: 'fac-1',
  };

  const otherFactoryUser: AuthUser = {
    id: 'user-fac-2',
    email: null,
    phone: '+919876543211',
    role: Role.FACTORY,
    status: 'ACTIVE' as any,
    factoryId: 'fac-2',
  };

  const brandUser: AuthUser = {
    id: 'user-brd-1',
    email: 'brand@example.com',
    phone: null,
    role: Role.BRAND,
    status: 'ACTIVE' as any,
    brandId: 'brd-1',
  };

  const adminUser: AuthUser = {
    id: 'user-adm-1',
    email: 'admin@factorymatch.in',
    phone: null,
    role: Role.ADMIN,
    status: 'ACTIVE' as any,
  };

  const mockFactoryRecord = {
    id: 'fac-1',
    ownerUserId: 'user-fac-1',
    legalName: 'Apex Protein Bars Ltd',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560001',
    capacityNotes: 'Private capacity remarks',
    tier: VerificationTier.TIER_1_DOCUMENTS,
    status: FactoryStatus.ACTIVE,
    leadTimeDaysMin: 10,
    leadTimeDaysMax: 20,
    capabilities: [
      {
        id: 'cap-1',
        verticalId: 'vert-1',
        productType: 'Protein Bars',
        moqUnits: 2500,
        capacityUnitsPerMonth: 50000,
        packagingOptions: ['Pouch'],
        attributesJson: {},
      },
    ],
    certificates: [
      {
        id: 'cert-1',
        type: CertificateType.FSSAI,
        number: '12345678901234',
        issuer: 'FSSAI Central',
        validFrom: new Date('2024-01-01'),
        validTo: new Date('2026-01-01'),
        fileId: 'file-fssai-1',
        status: CertificateStatus.VERIFIED,
      },
      {
        id: 'cert-2',
        type: CertificateType.ISO,
        number: 'ISO-9001-445',
        issuer: 'TUV',
        validFrom: new Date('2024-01-01'),
        validTo: new Date('2027-01-01'),
        fileId: 'file-iso-1',
        status: CertificateStatus.SUBMITTED,
      },
    ],
  };

  beforeEach(() => {
    mockRepo = {
      createFactory: vi.fn(),
      findById: vi.fn(),
      findByOwnerUserId: vi.fn(),
      listAll: vi.fn(),
      addCapability: vi.fn(),
      submitCertificate: vi.fn(),
      updateCertificateStatus: vi.fn(),
      updateFactoryStatus: vi.fn(),
      updateFactoryTier: vi.fn(),
    };

    service = new FactoriesService(mockRepo as unknown as FactoriesRepository);
  });

  describe('createProfile', () => {
    const createDto = {
      legalName: 'Apex Protein Bars Ltd',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560001',
      capacityNotes: '50k bars monthly',
      leadTimeDaysMin: 10,
      leadTimeDaysMax: 20,
      verticalId: 'snack-nutrition-v1',
    };

    it('successfully creates factory profile for FACTORY user', async () => {
      mockRepo.findByOwnerUserId.mockResolvedValue(null);
      mockRepo.createFactory.mockResolvedValue({
        id: 'fac-1',
        ownerUserId: ownerUser.id,
        ...createDto,
        status: FactoryStatus.PENDING,
        tier: VerificationTier.TIER_1_DOCUMENTS,
      });

      const result = await service.createProfile(ownerUser, createDto);

      expect(result.id).toBe('fac-1');
      expect(result.ownerUserId).toBe(ownerUser.id);
      expect(mockRepo.createFactory).toHaveBeenCalledWith(ownerUser.id, createDto);
    });

    it('rejects non-FACTORY users with ForbiddenError', async () => {
      await expect(service.createProfile(brandUser, createDto)).rejects.toThrow(ForbiddenError);
    });

    it('rejects duplicate factory creation with ConflictError when user already has a factory', async () => {
      mockRepo.findByOwnerUserId.mockResolvedValue({ id: 'existing-fac-id' });

      await expect(service.createProfile(ownerUser, createDto)).rejects.toThrow(ConflictError);
      expect(mockRepo.createFactory).not.toHaveBeenCalled();
    });
  });

  describe('getProfile', () => {
    it('returns full factory profile for factory owner', async () => {
      mockRepo.findById.mockResolvedValue(mockFactoryRecord);

      const result = await service.getProfile(ownerUser, 'fac-1');

      expect(result).toEqual(mockFactoryRecord);
      expect((result as any).capacityNotes).toBe('Private capacity remarks');
      expect((result as any).certificates).toHaveLength(2);
    });

    it('returns full factory profile for admin', async () => {
      mockRepo.findById.mockResolvedValue(mockFactoryRecord);

      const result = await service.getProfile(adminUser, 'fac-1');

      expect(result).toEqual(mockFactoryRecord);
    });

    it('returns public profile only for brand (unverified certs and private notes redacted)', async () => {
      mockRepo.findById.mockResolvedValue(mockFactoryRecord);

      const result = await service.getProfile(brandUser, 'fac-1');

      expect(result.id).toBe('fac-1');
      expect(result.legalName).toBe('Apex Protein Bars Ltd');
      // Only 1 verified certificate should be present
      expect((result as any).verifiedCertificates).toHaveLength(1);
      expect((result as any).verifiedCertificates[0].type).toBe(CertificateType.FSSAI);
      // Private fields must be absent
      expect((result as any).capacityNotes).toBeUndefined();
      expect((result as any).pincode).toBeUndefined();
      expect((result as any).ownerUserId).toBeUndefined();
    });

    it('returns NotFoundError (404) for cross-tenant access when other factory views non-owned factory', async () => {
      mockRepo.findById.mockResolvedValue(mockFactoryRecord);

      await expect(service.getProfile(otherFactoryUser, 'fac-1')).rejects.toThrow(NotFoundError);
    });

    it('returns NotFoundError (404) when BRAND views PENDING factory', async () => {
      mockRepo.findById.mockResolvedValue({
        ...mockFactoryRecord,
        status: FactoryStatus.PENDING,
      });

      await expect(service.getProfile(brandUser, 'fac-1')).rejects.toThrow(NotFoundError);
    });

    it('throws NotFoundError (404) when factory is not found in database', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.getProfile(ownerUser, 'non-existent')).rejects.toThrow(NotFoundError);
    });
  });

  describe('listFactories', () => {
    it('enforces ACTIVE status for BRAND users and returns public projections', async () => {
      mockRepo.listAll.mockResolvedValue({
        items: [mockFactoryRecord],
        nextCursor: undefined,
      });

      const result = await service.listFactories(brandUser, { city: 'Bengaluru' });

      expect(mockRepo.listAll).toHaveBeenCalledWith(
        { city: 'Bengaluru', status: FactoryStatus.ACTIVE },
        {},
      );
      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('fac-1');
      expect((result.items[0] as any).capacityNotes).toBeUndefined();
    });

    it('allows ADMIN to filter by any status and tier', async () => {
      mockRepo.listAll.mockResolvedValue({
        items: [mockFactoryRecord],
        nextCursor: 'cursor-2',
      });

      const filters = {
        status: FactoryStatus.PENDING,
        tier: VerificationTier.TIER_1_DOCUMENTS,
      };

      const result = await service.listFactories(adminUser, filters, { limit: 10 });

      expect(mockRepo.listAll).toHaveBeenCalledWith(filters, { limit: 10 });
      expect(result.nextCursor).toBe('cursor-2');
    });
  });

  describe('addCapability', () => {
    const capabilityDto = {
      verticalId: 'snack-nutrition-v1',
      productType: 'Granola Bars',
      moqUnits: 3000,
      capacityUnitsPerMonth: 40000,
      packagingOptions: ['Box of 6'],
      attributesJson: { flavorOptions: ['Berry', 'Chocolate'] },
    };

    it('allows factory owner to add capability', async () => {
      mockRepo.findById.mockResolvedValue(mockFactoryRecord);
      mockRepo.addCapability.mockResolvedValue({ id: 'cap-new', ...capabilityDto });

      const result = await service.addCapability(ownerUser, 'fac-1', capabilityDto);

      expect(result.id).toBe('cap-new');
      expect(mockRepo.addCapability).toHaveBeenCalledWith('fac-1', capabilityDto);
    });

    it('DENIES non-owner factory user from adding capability with NotFoundError (404)', async () => {
      mockRepo.findById.mockResolvedValue(mockFactoryRecord);

      await expect(
        service.addCapability(otherFactoryUser, 'fac-1', capabilityDto),
      ).rejects.toThrow(NotFoundError);

      expect(mockRepo.addCapability).not.toHaveBeenCalled();
    });

    it('throws NotFoundError when factory does not exist', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(
        service.addCapability(ownerUser, 'non-existent', capabilityDto),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('submitCertificate', () => {
    const validCertificateDto = {
      type: CertificateType.GMP,
      number: 'GMP-998877',
      issuer: 'GMP Certifications India',
      validFrom: '2024-01-01T00:00:00.000Z',
      validTo: '2026-01-01T00:00:00.000Z',
      fileId: 'file-gmp-123',
    };

    it('allows factory owner to submit certificate with valid dates', async () => {
      mockRepo.findById.mockResolvedValue(mockFactoryRecord);
      mockRepo.submitCertificate.mockResolvedValue({
        id: 'cert-new',
        ...validCertificateDto,
        status: CertificateStatus.SUBMITTED,
      });

      const result = await service.submitCertificate(ownerUser, 'fac-1', validCertificateDto);

      expect(result.id).toBe('cert-new');
      expect(mockRepo.submitCertificate).toHaveBeenCalledWith('fac-1', validCertificateDto);
    });

    it('rejects certificate with validTo <= validFrom with ValidationError', async () => {
      mockRepo.findById.mockResolvedValue(mockFactoryRecord);

      const invalidDto = {
        ...validCertificateDto,
        validFrom: '2026-01-01T00:00:00.000Z',
        validTo: '2024-01-01T00:00:00.000Z',
      };

      await expect(service.submitCertificate(ownerUser, 'fac-1', invalidDto)).rejects.toThrow(
        ValidationError,
      );
      expect(mockRepo.submitCertificate).not.toHaveBeenCalled();
    });

    it('rejects invalid date strings with ValidationError', async () => {
      mockRepo.findById.mockResolvedValue(mockFactoryRecord);

      const invalidDateDto = {
        ...validCertificateDto,
        validFrom: 'not-a-date',
        validTo: 'invalid-date',
      };

      await expect(
        service.submitCertificate(ownerUser, 'fac-1', invalidDateDto),
      ).rejects.toThrow(ValidationError);
    });

    it('DENIES non-owner from submitting certificate with NotFoundError (404)', async () => {
      mockRepo.findById.mockResolvedValue(mockFactoryRecord);

      await expect(
        service.submitCertificate(otherFactoryUser, 'fac-1', validCertificateDto),
      ).rejects.toThrow(NotFoundError);
      expect(mockRepo.submitCertificate).not.toHaveBeenCalled();
    });

    it('throws NotFoundError when factory does not exist', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(
        service.submitCertificate(ownerUser, 'non-existent', validCertificateDto),
      ).rejects.toThrow(NotFoundError);
    });
  });
});
