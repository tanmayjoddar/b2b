import { describe, it, expect } from 'vitest';
import { OrdersPolicy } from './orders.policy.js';
import { AuthUser, Role, UserStatus, OrderStatus } from '@factorymatch/shared';
import { NotFoundError, ForbiddenError } from '../../common/errors/app-error.js';

describe('OrdersPolicy', () => {
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

  const sampleOrder = {
    brandId: 'brand-111',
    factoryId: 'factory-aaa',
    status: OrderStatus.CONFIRMED,
  };

  describe('canViewOrder', () => {
    it('allows brand owner to view their order', () => {
      expect(OrdersPolicy.canViewOrder(brandUserA, sampleOrder)).toBe(true);
      expect(() => OrdersPolicy.assertCanView(brandUserA, sampleOrder)).not.toThrow();
    });

    it('denies brand from viewing another brands order with 404 (NotFoundError)', () => {
      expect(OrdersPolicy.canViewOrder(brandUserB, sampleOrder)).toBe(false);
      expect(() => OrdersPolicy.assertCanView(brandUserB, sampleOrder)).toThrow(NotFoundError);
    });

    it('allows factory to view an order placed with it', () => {
      expect(OrdersPolicy.canViewOrder(factoryUserA, sampleOrder)).toBe(true);
      expect(() => OrdersPolicy.assertCanView(factoryUserA, sampleOrder)).not.toThrow();
    });

    it('denies another factory from viewing the order with 404 (NotFoundError)', () => {
      expect(OrdersPolicy.canViewOrder(factoryUserB, sampleOrder)).toBe(false);
      expect(() => OrdersPolicy.assertCanView(factoryUserB, sampleOrder)).toThrow(NotFoundError);
    });

    it('allows admin to view any order', () => {
      expect(OrdersPolicy.canViewOrder(adminUser, sampleOrder)).toBe(true);
      expect(() => OrdersPolicy.assertCanView(adminUser, sampleOrder)).not.toThrow();
    });
  });

  describe('canTransition', () => {
    describe('Admin permissions', () => {
      it('allows admin to perform any state transition', () => {
        expect(OrdersPolicy.canTransition(adminUser, sampleOrder, OrderStatus.CANCELLED)).toBe(true);
        expect(OrdersPolicy.canTransition(adminUser, sampleOrder, OrderStatus.READY)).toBe(true);
        expect(OrdersPolicy.canTransition(adminUser, sampleOrder, OrderStatus.SHIPPED)).toBe(true);
        expect(OrdersPolicy.canTransition(adminUser, sampleOrder, OrderStatus.IN_PRODUCTION)).toBe(true);
      });
    });

    describe('Brand permissions', () => {
      it('allows brand owner to cancel order', () => {
        expect(OrdersPolicy.canTransition(brandUserA, sampleOrder, OrderStatus.CANCELLED)).toBe(true);
        expect(() =>
          OrdersPolicy.assertCanTransition(brandUserA, sampleOrder, OrderStatus.CANCELLED),
        ).not.toThrow();
      });

      it('allows brand owner to approve sample or advance pay', () => {
        expect(OrdersPolicy.canTransition(brandUserA, sampleOrder, OrderStatus.SAMPLE_APPROVED)).toBe(true);
        expect(OrdersPolicy.canTransition(brandUserA, sampleOrder, OrderStatus.ADVANCE_PAID)).toBe(true);
      });

      it('allows brand owner to dispute or complete order', () => {
        expect(OrdersPolicy.canTransition(brandUserA, sampleOrder, OrderStatus.DISPUTED)).toBe(true);
        expect(OrdersPolicy.canTransition(brandUserA, sampleOrder, OrderStatus.COMPLETED)).toBe(true);
      });

      it('denies brand from transitioning to factory-controlled states (READY, SHIPPED, IN_PRODUCTION)', () => {
        expect(OrdersPolicy.canTransition(brandUserA, sampleOrder, OrderStatus.READY)).toBe(false);
        expect(OrdersPolicy.canTransition(brandUserA, sampleOrder, OrderStatus.SHIPPED)).toBe(false);
        expect(OrdersPolicy.canTransition(brandUserA, sampleOrder, OrderStatus.IN_PRODUCTION)).toBe(false);

        expect(() =>
          OrdersPolicy.assertCanTransition(brandUserA, sampleOrder, OrderStatus.READY),
        ).toThrow(ForbiddenError);
      });
    });

    describe('Factory permissions', () => {
      it('allows factory to move order to IN_PRODUCTION, READY, and SHIPPED', () => {
        expect(OrdersPolicy.canTransition(factoryUserA, sampleOrder, OrderStatus.IN_PRODUCTION)).toBe(true);
        expect(OrdersPolicy.canTransition(factoryUserA, sampleOrder, OrderStatus.READY)).toBe(true);
        expect(OrdersPolicy.canTransition(factoryUserA, sampleOrder, OrderStatus.SHIPPED)).toBe(true);
        expect(() =>
          OrdersPolicy.assertCanTransition(factoryUserA, sampleOrder, OrderStatus.READY),
        ).not.toThrow();
      });

      it('denies factory from cancelling order', () => {
        expect(OrdersPolicy.canTransition(factoryUserA, sampleOrder, OrderStatus.CANCELLED)).toBe(false);
        expect(() =>
          OrdersPolicy.assertCanTransition(factoryUserA, sampleOrder, OrderStatus.CANCELLED),
        ).toThrow(ForbiddenError);
      });

      it('denies factory from approving sample or marking advance paid', () => {
        expect(OrdersPolicy.canTransition(factoryUserA, sampleOrder, OrderStatus.SAMPLE_APPROVED)).toBe(false);
        expect(OrdersPolicy.canTransition(factoryUserA, sampleOrder, OrderStatus.ADVANCE_PAID)).toBe(false);
        expect(() =>
          OrdersPolicy.assertCanTransition(factoryUserA, sampleOrder, OrderStatus.SAMPLE_APPROVED),
        ).toThrow(ForbiddenError);
      });
    });

    describe('Cross-tenant isolation', () => {
      it('throws NotFoundError (404) when a foreign brand attempts transition on another brand order', () => {
        expect(() =>
          OrdersPolicy.assertCanTransition(brandUserB, sampleOrder, OrderStatus.CANCELLED),
        ).toThrow(NotFoundError);
      });

      it('throws NotFoundError (404) when a foreign factory attempts transition on another factory order', () => {
        expect(() =>
          OrdersPolicy.assertCanTransition(factoryUserB, sampleOrder, OrderStatus.READY),
        ).toThrow(NotFoundError);
      });
    });
  });
});
