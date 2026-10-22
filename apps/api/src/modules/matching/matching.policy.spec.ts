import { describe, it, expect } from 'vitest';
import { AuthUser, Role, UserStatus } from '@factorymatch/shared';
import { canCreateShortlist, canViewShortlist } from './matching.policy.js';

describe('Matching Policy', () => {
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

  const brandUser2: AuthUser = {
    id: 'usr-brand-2',
    email: 'brand2@example.com',
    phone: null,
    role: Role.BRAND,
    status: UserStatus.ACTIVE,
    brandId: 'brand-2',
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

  describe('canCreateShortlist', () => {
    it('allows admin to create shortlist', () => {
      expect(canCreateShortlist(adminUser)).toBe(true);
    });

    it('denies brand from creating shortlist', () => {
      expect(canCreateShortlist(brandUser1)).toBe(false);
    });

    it('denies factory from creating shortlist', () => {
      expect(canCreateShortlist(factoryUser)).toBe(false);
    });
  });

  describe('canViewShortlist', () => {
    const brief = { brandId: 'brand-1' };

    it('allows admin to view shortlist', () => {
      expect(canViewShortlist(adminUser, brief)).toBe(true);
    });

    it('allows owning brand to view shortlist', () => {
      expect(canViewShortlist(brandUser1, brief)).toBe(true);
    });

    it('denies other brand from viewing shortlist (cross-tenant access denial)', () => {
      expect(canViewShortlist(brandUser2, brief)).toBe(false);
    });

    it('denies brand user without brandId', () => {
      const userWithoutBrand: AuthUser = { ...brandUser1, brandId: null };
      expect(canViewShortlist(userWithoutBrand, brief)).toBe(false);
    });

    it('denies factory user from viewing brand shortlist', () => {
      expect(canViewShortlist(factoryUser, brief)).toBe(false);
    });
  });
});
