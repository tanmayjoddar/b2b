import { describe, it, expect } from 'vitest';
import {
  CertificateStatus,
  CertificateType,
  FactoryStatus,
  Role,
  VerificationTier,
} from '@factorymatch/shared';
import {
  canViewFactory,
  canEditFactory,
  canVerifyFactory,
  canViewPrivateDocs,
  toFactoryPublicProfile,
} from './factories.policy.js';

describe('FactoriesPolicy', () => {
  const adminUser = { id: 'admin-1', role: Role.ADMIN };
  const ownerUser = { id: 'factory-owner-1', role: Role.FACTORY };
  const otherFactoryUser = { id: 'factory-owner-2', role: Role.FACTORY };
  const brandUser = { id: 'brand-1', role: Role.BRAND };

  const activeFactory = {
    id: 'fac-1',
    ownerUserId: 'factory-owner-1',
    status: FactoryStatus.ACTIVE,
  };

  const pendingFactory = {
    id: 'fac-2',
    ownerUserId: 'factory-owner-1',
    status: FactoryStatus.PENDING,
  };

  const suspendedFactory = {
    id: 'fac-3',
    ownerUserId: 'factory-owner-1',
    status: FactoryStatus.SUSPENDED,
  };

  describe('canViewFactory', () => {
    it('allows ADMIN to view factory in any status', () => {
      expect(canViewFactory(adminUser, activeFactory)).toBe(true);
      expect(canViewFactory(adminUser, pendingFactory)).toBe(true);
      expect(canViewFactory(adminUser, suspendedFactory)).toBe(true);
    });

    it('allows FACTORY owner to view their own factory regardless of status', () => {
      expect(canViewFactory(ownerUser, activeFactory)).toBe(true);
      expect(canViewFactory(ownerUser, pendingFactory)).toBe(true);
      expect(canViewFactory(ownerUser, suspendedFactory)).toBe(true);
    });

    it('DENIES cross-tenant access when a factory user tries to view another factory', () => {
      expect(canViewFactory(otherFactoryUser, activeFactory)).toBe(false);
      expect(canViewFactory(otherFactoryUser, pendingFactory)).toBe(false);
      expect(canViewFactory(otherFactoryUser, suspendedFactory)).toBe(false);
    });

    it('allows BRAND to view ACTIVE factory', () => {
      expect(canViewFactory(brandUser, activeFactory)).toBe(true);
    });

    it('DENIES BRAND from viewing PENDING or SUSPENDED factory', () => {
      expect(canViewFactory(brandUser, pendingFactory)).toBe(false);
      expect(canViewFactory(brandUser, suspendedFactory)).toBe(false);
    });

    it('returns false for null or undefined arguments', () => {
      expect(canViewFactory(null, activeFactory)).toBe(false);
      expect(canViewFactory(adminUser, null)).toBe(false);
      expect(canViewFactory(undefined, undefined)).toBe(false);
    });
  });

  describe('canEditFactory', () => {
    it('allows ADMIN to edit factory', () => {
      expect(canEditFactory(adminUser, activeFactory)).toBe(true);
    });

    it('allows FACTORY owner to edit their own factory', () => {
      expect(canEditFactory(ownerUser, activeFactory)).toBe(true);
    });

    it('DENIES cross-tenant edit when a factory user attempts to edit another factory', () => {
      expect(canEditFactory(otherFactoryUser, activeFactory)).toBe(false);
    });

    it('DENIES BRAND from editing factory', () => {
      expect(canEditFactory(brandUser, activeFactory)).toBe(false);
    });

    it('returns false for null or undefined arguments', () => {
      expect(canEditFactory(null, activeFactory)).toBe(false);
      expect(canEditFactory(ownerUser, null)).toBe(false);
    });
  });

  describe('canVerifyFactory', () => {
    it('allows ADMIN to verify factory', () => {
      expect(canVerifyFactory(adminUser)).toBe(true);
    });

    it('DENIES FACTORY role from verifying factory', () => {
      expect(canVerifyFactory(ownerUser)).toBe(false);
    });

    it('DENIES BRAND role from verifying factory', () => {
      expect(canVerifyFactory(brandUser)).toBe(false);
    });

    it('returns false for null or undefined user', () => {
      expect(canVerifyFactory(null)).toBe(false);
      expect(canVerifyFactory(undefined)).toBe(false);
    });
  });

  describe('canViewPrivateDocs', () => {
    it('allows ADMIN to view private documents', () => {
      expect(canViewPrivateDocs(adminUser, activeFactory)).toBe(true);
    });

    it('allows FACTORY owner to view private documents of own factory', () => {
      expect(canViewPrivateDocs(ownerUser, activeFactory)).toBe(true);
    });

    it('DENIES cross-tenant access to private documents by another factory', () => {
      expect(canViewPrivateDocs(otherFactoryUser, activeFactory)).toBe(false);
    });

    it('DENIES BRAND from viewing private documents', () => {
      expect(canViewPrivateDocs(brandUser, activeFactory)).toBe(false);
    });

    it('returns false for null or undefined arguments', () => {
      expect(canViewPrivateDocs(null, activeFactory)).toBe(false);
      expect(canViewPrivateDocs(ownerUser, null)).toBe(false);
    });
  });

  describe('toFactoryPublicProfile', () => {
    it('projects public profile with only verified certificates and non-sensitive fields', () => {
      const fullFactory = {
        id: 'fac-99',
        ownerUserId: 'user-fac-99',
        legalName: 'Acme Snacks Manufacturing Pvt Ltd',
        city: 'Pune',
        state: 'Maharashtra',
        pincode: '411001',
        capacityNotes: 'Secret capacity details that brands should not see directly',
        tier: VerificationTier.TIER_2_VIDEO,
        status: FactoryStatus.ACTIVE,
        leadTimeDaysMin: 14,
        leadTimeDaysMax: 28,
        capabilities: [
          {
            id: 'cap-1',
            productType: 'Protein Bars',
            moqUnits: 5000,
            capacityUnitsPerMonth: 50000,
            packagingOptions: ['Flow wrap', 'Box of 12'],
            attributesJson: { internalCode: 'xyz' },
          },
        ],
        certificates: [
          {
            id: 'cert-1',
            type: CertificateType.FSSAI,
            number: '10012345678901',
            issuer: 'FSSAI',
            validTo: new Date('2027-12-31T00:00:00.000Z'),
            fileId: 'file-fssai-secret-uuid',
            status: CertificateStatus.VERIFIED,
          },
          {
            id: 'cert-2',
            type: CertificateType.GST,
            number: '27AAAAA0000A1Z5',
            issuer: 'GSTN',
            validTo: new Date('2028-01-01T00:00:00.000Z'),
            fileId: 'file-gst-secret-uuid',
            status: CertificateStatus.SUBMITTED, // NOT verified, must be excluded!
          },
        ],
      };

      const publicProfile = toFactoryPublicProfile(fullFactory);

      expect(publicProfile.id).toBe('fac-99');
      expect(publicProfile.legalName).toBe('Acme Snacks Manufacturing Pvt Ltd');
      expect(publicProfile.city).toBe('Pune');
      expect(publicProfile.state).toBe('Maharashtra');
      expect(publicProfile.tier).toBe(VerificationTier.TIER_2_VIDEO);
      expect(publicProfile.status).toBe(FactoryStatus.ACTIVE);
      expect(publicProfile.leadTimeDaysMin).toBe(14);
      expect(publicProfile.leadTimeDaysMax).toBe(28);

      // Verify capabilities are projected without internal IDs
      expect(publicProfile.capabilities).toHaveLength(1);
      expect(publicProfile.capabilities[0].productType).toBe('Protein Bars');
      expect(publicProfile.capabilities[0].moqUnits).toBe(5000);

      // Verify ONLY verified certificate is included
      expect(publicProfile.verifiedCertificates).toHaveLength(1);
      expect(publicProfile.verifiedCertificates[0].type).toBe(CertificateType.FSSAI);
      expect(publicProfile.verifiedCertificates[0].issuer).toBe('FSSAI');

      // Sensitive fields must NOT exist on public profile
      expect((publicProfile as any).pincode).toBeUndefined();
      expect((publicProfile as any).capacityNotes).toBeUndefined();
      expect((publicProfile as any).ownerUserId).toBeUndefined();
      expect((publicProfile.verifiedCertificates[0] as any).number).toBeUndefined();
      expect((publicProfile.verifiedCertificates[0] as any).fileId).toBeUndefined();
    });
  });
});
