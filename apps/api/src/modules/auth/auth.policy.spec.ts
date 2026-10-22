import { describe, it, expect } from 'vitest';
import { AuthPolicy } from './auth.policy.js';
import { AuthUser, Role, UserStatus } from '@factorymatch/shared';
import { NotFoundError } from '../../common/errors/app-error.js';

describe('AuthPolicy Tenant Isolation & Security', () => {
  const brandUserA: AuthUser = {
    id: 'user-brand-a',
    email: 'brand-a@example.com',
    phone: null,
    role: Role.BRAND,
    status: UserStatus.ACTIVE,
    brandId: 'brand-111',
    factoryId: null,
  };

  const brandUserB: AuthUser = {
    id: 'user-brand-b',
    email: 'brand-b@example.com',
    phone: null,
    role: Role.BRAND,
    status: UserStatus.ACTIVE,
    brandId: 'brand-222',
    factoryId: null,
  };

  const factoryUserA: AuthUser = {
    id: 'user-factory-a',
    email: null,
    phone: '+919876543210',
    role: Role.FACTORY,
    status: UserStatus.ACTIVE,
    brandId: null,
    factoryId: 'factory-aaa',
  };

  const factoryUserB: AuthUser = {
    id: 'user-factory-b',
    email: null,
    phone: '+919876543211',
    role: Role.FACTORY,
    status: UserStatus.ACTIVE,
    brandId: null,
    factoryId: 'factory-bbb',
  };

  const adminUser: AuthUser = {
    id: 'user-admin',
    email: 'admin@factorymatch.in',
    phone: null,
    role: Role.ADMIN,
    status: UserStatus.ACTIVE,
    brandId: null,
    factoryId: null,
  };

  describe('assertBrandAccess', () => {
    it('allows brand user to access their own brand', () => {
      expect(() => AuthPolicy.assertBrandAccess(brandUserA, 'brand-111')).not.toThrow();
    });

    it('denies brand user from accessing another brand and throws NotFoundError (404, not 403) to prevent existence leakage', () => {
      expect(() => AuthPolicy.assertBrandAccess(brandUserA, 'brand-222')).toThrow(NotFoundError);
    });

    it('denies factory user from accessing a brand profile', () => {
      expect(() => AuthPolicy.assertBrandAccess(factoryUserA, 'brand-111')).toThrow(NotFoundError);
    });

    it('allows admin to access any brand', () => {
      expect(() => AuthPolicy.assertBrandAccess(adminUser, 'brand-111')).not.toThrow();
      expect(() => AuthPolicy.assertBrandAccess(adminUser, 'brand-222')).not.toThrow();
    });
  });

  describe('assertFactoryAccess', () => {
    it('allows factory user to access their own factory', () => {
      expect(() => AuthPolicy.assertFactoryAccess(factoryUserA, 'factory-aaa')).not.toThrow();
    });

    it('denies factory user from accessing another factory and throws NotFoundError (404)', () => {
      expect(() => AuthPolicy.assertFactoryAccess(factoryUserA, 'factory-bbb')).toThrow(NotFoundError);
    });

    it('denies brand user from accessing private factory data', () => {
      expect(() => AuthPolicy.assertFactoryAccess(brandUserA, 'factory-aaa')).toThrow(NotFoundError);
    });

    it('allows admin to access any factory', () => {
      expect(() => AuthPolicy.assertFactoryAccess(adminUser, 'factory-aaa')).not.toThrow();
      expect(() => AuthPolicy.assertFactoryAccess(adminUser, 'factory-bbb')).not.toThrow();
    });
  });
});
