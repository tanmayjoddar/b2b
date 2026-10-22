import { describe, it, expect } from 'vitest';
import { Role, UserStatus, AuthUser } from '@factorymatch/shared';
import {
  canCreatePayment,
  canViewPayment,
  canViewOrderPayments,
  OrderOwnershipContext,
} from './payments.policy.js';

describe('PaymentsPolicy', () => {
  const brandUserA: AuthUser = {
    id: 'usr-brand-a',
    email: 'brand.a@example.com',
    phone: '+919876543210',
    role: Role.BRAND,
    status: UserStatus.ACTIVE,
    brandId: 'brand-a',
  };

  const brandUserB: AuthUser = {
    id: 'usr-brand-b',
    email: 'brand.b@example.com',
    phone: '+919876543211',
    role: Role.BRAND,
    status: UserStatus.ACTIVE,
    brandId: 'brand-b',
  };

  const factoryUserA: AuthUser = {
    id: 'usr-fac-a',
    email: 'factory.a@example.com',
    phone: '+919876543212',
    role: Role.FACTORY,
    status: UserStatus.ACTIVE,
    factoryId: 'factory-a',
  };

  const factoryUserB: AuthUser = {
    id: 'usr-fac-b',
    email: 'factory.b@example.com',
    phone: '+919876543213',
    role: Role.FACTORY,
    status: UserStatus.ACTIVE,
    factoryId: 'factory-b',
  };

  const adminUser: AuthUser = {
    id: 'usr-admin',
    email: 'admin@factorymatch.in',
    phone: null,
    role: Role.ADMIN,
    status: UserStatus.ACTIVE,
  };

  const orderA: OrderOwnershipContext = {
    brandId: 'brand-a',
    factoryId: 'factory-a',
    brand: { id: 'brand-a', userId: 'usr-brand-a' },
    factory: { id: 'factory-a', ownerUserId: 'usr-fac-a' },
  };

  const paymentA = { orderId: 'ord-1' };

  describe('canCreatePayment', () => {
    it('allows brand who owns the order to create payment (matching brandId)', () => {
      expect(canCreatePayment(brandUserA, orderA)).toBe(true);
    });

    it('allows brand who owns the order via brand.userId', () => {
      const userWithoutBrandId: AuthUser = {
        ...brandUserA,
        brandId: undefined,
      };
      expect(canCreatePayment(userWithoutBrandId, orderA)).toBe(true);
    });

    it('allows admin to create payment for any order', () => {
      expect(canCreatePayment(adminUser, orderA)).toBe(true);
    });

    it('denies another brand from creating payment (cross-tenant denial)', () => {
      expect(canCreatePayment(brandUserB, orderA)).toBe(false);
    });

    it('denies factory assigned to the order from creating payment', () => {
      expect(canCreatePayment(factoryUserA, orderA)).toBe(false);
    });

    it('denies unrelated factory from creating payment', () => {
      expect(canCreatePayment(factoryUserB, orderA)).toBe(false);
    });

    it('denies brand user if order brand does not match', () => {
      const mismatchedOrder = {
        brandId: 'brand-other',
        brand: { id: 'brand-other', userId: 'other-user' },
      };
      expect(canCreatePayment(brandUserA, mismatchedOrder)).toBe(false);
    });
  });

  describe('canViewPayment', () => {
    it('allows brand who owns the order to view payment', () => {
      expect(canViewPayment(brandUserA, paymentA, orderA)).toBe(true);
    });

    it('allows factory assigned to the order to view payment', () => {
      expect(canViewPayment(factoryUserA, paymentA, orderA)).toBe(true);
    });

    it('allows admin to view payment', () => {
      expect(canViewPayment(adminUser, paymentA, orderA)).toBe(true);
    });

    it('denies other brand from viewing payment (cross-tenant denial)', () => {
      expect(canViewPayment(brandUserB, paymentA, orderA)).toBe(false);
    });

    it('denies other factory from viewing payment (cross-tenant denial)', () => {
      expect(canViewPayment(factoryUserB, paymentA, orderA)).toBe(false);
    });
  });

  describe('canViewOrderPayments', () => {
    it('allows order-owning brand to view order payments', () => {
      expect(canViewOrderPayments(brandUserA, orderA)).toBe(true);
    });

    it('allows order-assigned factory to view order payments', () => {
      expect(canViewOrderPayments(factoryUserA, orderA)).toBe(true);
    });

    it('allows admin to view order payments', () => {
      expect(canViewOrderPayments(adminUser, orderA)).toBe(true);
    });

    it('denies cross-tenant brand from viewing order payments', () => {
      expect(canViewOrderPayments(brandUserB, orderA)).toBe(false);
    });

    it('denies cross-tenant factory from viewing order payments', () => {
      expect(canViewOrderPayments(factoryUserB, orderA)).toBe(false);
    });
  });
});
