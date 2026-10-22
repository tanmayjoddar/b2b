import { describe, it, expect } from 'vitest';
import { SamplesPolicy } from './samples.policy.js';
import { AuthUser, Role, UserStatus, SampleStatus } from '@factorymatch/shared';
import { NotFoundError, ForbiddenError } from '../../common/errors/app-error.js';

describe('SamplesPolicy', () => {
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

  const sampleContext = {
    factoryId: 'factory-aaa',
    brief: {
      brandId: 'brand-111',
    },
    status: SampleStatus.REQUESTED,
  };

  describe('canViewSample', () => {
    it('allows brand to view sample for their own brief', () => {
      expect(SamplesPolicy.canViewSample(brandUserA, sampleContext)).toBe(true);
      expect(() => SamplesPolicy.assertCanView(brandUserA, sampleContext)).not.toThrow();
    });

    it('denies foreign brand from viewing sample with 404 (NotFoundError)', () => {
      expect(SamplesPolicy.canViewSample(brandUserB, sampleContext)).toBe(false);
      expect(() => SamplesPolicy.assertCanView(brandUserB, sampleContext)).toThrow(NotFoundError);
    });

    it('allows assigned factory to view sample', () => {
      expect(SamplesPolicy.canViewSample(factoryUserA, sampleContext)).toBe(true);
      expect(() => SamplesPolicy.assertCanView(factoryUserA, sampleContext)).not.toThrow();
    });

    it('denies foreign factory from viewing sample with 404 (NotFoundError)', () => {
      expect(SamplesPolicy.canViewSample(factoryUserB, sampleContext)).toBe(false);
      expect(() => SamplesPolicy.assertCanView(factoryUserB, sampleContext)).toThrow(NotFoundError);
    });

    it('allows admin to view any sample', () => {
      expect(SamplesPolicy.canViewSample(adminUser, sampleContext)).toBe(true);
      expect(() => SamplesPolicy.assertCanView(adminUser, sampleContext)).not.toThrow();
    });
  });

  describe('canTransition', () => {
    it('allows factory to transition sample to DISPATCHED', () => {
      expect(SamplesPolicy.canTransition(factoryUserA, sampleContext, SampleStatus.DISPATCHED)).toBe(true);
      expect(() =>
        SamplesPolicy.assertCanTransition(factoryUserA, sampleContext, SampleStatus.DISPATCHED),
      ).not.toThrow();
    });

    it('denies factory from approving or rejecting sample', () => {
      expect(SamplesPolicy.canTransition(factoryUserA, sampleContext, SampleStatus.APPROVED)).toBe(false);
      expect(SamplesPolicy.canTransition(factoryUserA, sampleContext, SampleStatus.REJECTED)).toBe(false);
      expect(() =>
        SamplesPolicy.assertCanTransition(factoryUserA, sampleContext, SampleStatus.APPROVED),
      ).toThrow(ForbiddenError);
    });

    it('allows brand to mark sample RECEIVED, APPROVED, or REJECTED', () => {
      const dispatchedContext = { ...sampleContext, status: SampleStatus.DISPATCHED };
      expect(SamplesPolicy.canTransition(brandUserA, dispatchedContext, SampleStatus.RECEIVED)).toBe(true);
      expect(SamplesPolicy.canTransition(brandUserA, dispatchedContext, SampleStatus.APPROVED)).toBe(true);
      expect(SamplesPolicy.canTransition(brandUserA, dispatchedContext, SampleStatus.REJECTED)).toBe(true);
    });

    it('denies brand from dispatching sample', () => {
      expect(SamplesPolicy.canTransition(brandUserA, sampleContext, SampleStatus.DISPATCHED)).toBe(false);
      expect(() =>
        SamplesPolicy.assertCanTransition(brandUserA, sampleContext, SampleStatus.DISPATCHED),
      ).toThrow(ForbiddenError);
    });

    it('allows admin to transition to any status', () => {
      expect(SamplesPolicy.canTransition(adminUser, sampleContext, SampleStatus.DISPATCHED)).toBe(true);
      expect(SamplesPolicy.canTransition(adminUser, sampleContext, SampleStatus.APPROVED)).toBe(true);
    });

    it('denies foreign brand with NotFoundError (404)', () => {
      expect(() =>
        SamplesPolicy.assertCanTransition(brandUserB, sampleContext, SampleStatus.RECEIVED),
      ).toThrow(NotFoundError);
    });

    it('denies foreign factory with NotFoundError (404)', () => {
      expect(() =>
        SamplesPolicy.assertCanTransition(factoryUserB, sampleContext, SampleStatus.DISPATCHED),
      ).toThrow(NotFoundError);
    });
  });
});
