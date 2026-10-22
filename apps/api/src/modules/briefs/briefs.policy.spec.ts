import { describe, it, expect } from 'vitest';
import { AuthUser, BriefStatus, Role, UserStatus } from '@factorymatch/shared';
import {
  canViewBrief,
  canEditBrief,
  canSubmitBrief,
  canCancelBrief,
  isAllowedBriefTransition,
} from './briefs.policy.js';

describe('Briefs Policy', () => {
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

  const factoryUser1: AuthUser = {
    id: 'usr-factory-1',
    email: null,
    phone: '+919876543210',
    role: Role.FACTORY,
    status: UserStatus.ACTIVE,
    brandId: null,
    factoryId: 'factory-1',
  };

  const factoryUser2: AuthUser = {
    id: 'usr-factory-2',
    email: null,
    phone: '+919876543211',
    role: Role.FACTORY,
    status: UserStatus.ACTIVE,
    brandId: null,
    factoryId: 'factory-2',
  };

  const adminUser: AuthUser = {
    id: 'usr-admin-1',
    email: 'admin@factorymatch.com',
    phone: null,
    role: Role.ADMIN,
    status: UserStatus.ACTIVE,
    brandId: null,
    factoryId: null,
  };

  const testBrief = {
    id: 'brief-1',
    brandId: 'brand-1',
    status: BriefStatus.DRAFT,
    shortlists: [
      {
        items: [
          { factoryId: 'factory-1' },
        ],
      },
    ],
  };

  describe('canViewBrief', () => {
    it('allows owning brand to view their own brief', () => {
      expect(canViewBrief(brandUser1, testBrief)).toBe(true);
    });

    it('denies cross-tenant brand from viewing another brand brief', () => {
      expect(canViewBrief(brandUser2, testBrief)).toBe(false);
    });

    it('allows shortlisted factory to view the brief', () => {
      expect(canViewBrief(factoryUser1, testBrief)).toBe(true);
    });

    it('denies non-shortlisted factory from viewing the brief', () => {
      expect(canViewBrief(factoryUser2, testBrief)).toBe(false);
    });

    it('denies factory user with missing factoryId', () => {
      const incompleteFactoryUser: AuthUser = {
        ...factoryUser1,
        factoryId: null,
      };
      expect(canViewBrief(incompleteFactoryUser, testBrief)).toBe(false);
    });

    it('allows admin to view any brief', () => {
      expect(canViewBrief(adminUser, testBrief)).toBe(true);
    });
  });

  describe('canEditBrief', () => {
    it('allows owning brand to edit their own DRAFT brief', () => {
      expect(canEditBrief(brandUser1, { brandId: 'brand-1', status: BriefStatus.DRAFT })).toBe(true);
    });

    it('denies cross-tenant brand from editing another brand brief', () => {
      expect(canEditBrief(brandUser2, { brandId: 'brand-1', status: BriefStatus.DRAFT })).toBe(false);
    });

    it('denies editing when brief is in SUBMITTED status', () => {
      expect(canEditBrief(brandUser1, { brandId: 'brand-1', status: BriefStatus.SUBMITTED })).toBe(false);
    });

    it('denies editing when brief is in MATCHING status', () => {
      expect(canEditBrief(brandUser1, { brandId: 'brand-1', status: BriefStatus.MATCHING })).toBe(false);
    });

    it('denies editing when brief is in SHORTLISTED status', () => {
      expect(canEditBrief(brandUser1, { brandId: 'brand-1', status: BriefStatus.SHORTLISTED })).toBe(false);
    });

    it('denies editing when brief is in CANCELLED status', () => {
      expect(canEditBrief(brandUser1, { brandId: 'brand-1', status: BriefStatus.CANCELLED })).toBe(false);
    });

    it('denies admin from editing brief (only brand edits draft)', () => {
      expect(canEditBrief(adminUser, { brandId: 'brand-1', status: BriefStatus.DRAFT })).toBe(false);
    });

    it('denies factory from editing brief', () => {
      expect(canEditBrief(factoryUser1, { brandId: 'brand-1', status: BriefStatus.DRAFT })).toBe(false);
    });
  });

  describe('canSubmitBrief', () => {
    it('allows owning brand to submit their own DRAFT brief', () => {
      expect(canSubmitBrief(brandUser1, { brandId: 'brand-1', status: BriefStatus.DRAFT })).toBe(true);
    });

    it('denies cross-tenant brand from submitting another brand brief', () => {
      expect(canSubmitBrief(brandUser2, { brandId: 'brand-1', status: BriefStatus.DRAFT })).toBe(false);
    });

    it('denies submitting if already SUBMITTED', () => {
      expect(canSubmitBrief(brandUser1, { brandId: 'brand-1', status: BriefStatus.SUBMITTED })).toBe(false);
    });

    it('denies admin or factory from submitting brief', () => {
      expect(canSubmitBrief(adminUser, { brandId: 'brand-1', status: BriefStatus.DRAFT })).toBe(false);
      expect(canSubmitBrief(factoryUser1, { brandId: 'brand-1', status: BriefStatus.DRAFT })).toBe(false);
    });
  });

  describe('canCancelBrief', () => {
    it('allows owning brand to cancel active briefs', () => {
      const activeStatuses = [
        BriefStatus.DRAFT,
        BriefStatus.SUBMITTED,
        BriefStatus.MATCHING,
        BriefStatus.SHORTLISTED,
        BriefStatus.QUOTING,
      ];

      for (const status of activeStatuses) {
        expect(canCancelBrief(brandUser1, { brandId: 'brand-1', status })).toBe(true);
      }
    });

    it('denies owning brand from cancelling terminal briefs (CLOSED or CANCELLED)', () => {
      expect(canCancelBrief(brandUser1, { brandId: 'brand-1', status: BriefStatus.CLOSED })).toBe(false);
      expect(canCancelBrief(brandUser1, { brandId: 'brand-1', status: BriefStatus.CANCELLED })).toBe(false);
    });

    it('denies cross-tenant brand from cancelling another brand brief', () => {
      expect(canCancelBrief(brandUser2, { brandId: 'brand-1', status: BriefStatus.DRAFT })).toBe(false);
      expect(canCancelBrief(brandUser2, { brandId: 'brand-1', status: BriefStatus.SUBMITTED })).toBe(false);
    });

    it('allows admin to cancel active briefs', () => {
      expect(canCancelBrief(adminUser, { brandId: 'brand-1', status: BriefStatus.SUBMITTED })).toBe(true);
      expect(canCancelBrief(adminUser, { brandId: 'brand-1', status: BriefStatus.MATCHING })).toBe(true);
    });

    it('denies admin from cancelling terminal briefs', () => {
      expect(canCancelBrief(adminUser, { brandId: 'brand-1', status: BriefStatus.CLOSED })).toBe(false);
      expect(canCancelBrief(adminUser, { brandId: 'brand-1', status: BriefStatus.CANCELLED })).toBe(false);
    });

    it('denies factory from cancelling brief', () => {
      expect(canCancelBrief(factoryUser1, { brandId: 'brand-1', status: BriefStatus.DRAFT })).toBe(false);
    });
  });

  describe('isAllowedBriefTransition', () => {
    it('allows valid state transitions', () => {
      expect(isAllowedBriefTransition(BriefStatus.DRAFT, BriefStatus.SUBMITTED)).toBe(true);
      expect(isAllowedBriefTransition(BriefStatus.DRAFT, BriefStatus.CANCELLED)).toBe(true);
      expect(isAllowedBriefTransition(BriefStatus.SUBMITTED, BriefStatus.MATCHING)).toBe(true);
      expect(isAllowedBriefTransition(BriefStatus.SUBMITTED, BriefStatus.SHORTLISTED)).toBe(true);
      expect(isAllowedBriefTransition(BriefStatus.SUBMITTED, BriefStatus.CANCELLED)).toBe(true);
      expect(isAllowedBriefTransition(BriefStatus.MATCHING, BriefStatus.SHORTLISTED)).toBe(true);
      expect(isAllowedBriefTransition(BriefStatus.MATCHING, BriefStatus.CANCELLED)).toBe(true);
      expect(isAllowedBriefTransition(BriefStatus.SHORTLISTED, BriefStatus.QUOTING)).toBe(true);
      expect(isAllowedBriefTransition(BriefStatus.SHORTLISTED, BriefStatus.CANCELLED)).toBe(true);
      expect(isAllowedBriefTransition(BriefStatus.QUOTING, BriefStatus.CLOSED)).toBe(true);
      expect(isAllowedBriefTransition(BriefStatus.QUOTING, BriefStatus.CANCELLED)).toBe(true);
    });

    it('denies illegal state transitions', () => {
      expect(isAllowedBriefTransition(BriefStatus.DRAFT, BriefStatus.SHORTLISTED)).toBe(false);
      expect(isAllowedBriefTransition(BriefStatus.DRAFT, BriefStatus.QUOTING)).toBe(false);
      expect(isAllowedBriefTransition(BriefStatus.DRAFT, BriefStatus.CLOSED)).toBe(false);
      expect(isAllowedBriefTransition(BriefStatus.CLOSED, BriefStatus.DRAFT)).toBe(false);
      expect(isAllowedBriefTransition(BriefStatus.CLOSED, BriefStatus.CANCELLED)).toBe(false);
      expect(isAllowedBriefTransition(BriefStatus.CANCELLED, BriefStatus.DRAFT)).toBe(false);
      expect(isAllowedBriefTransition(BriefStatus.CANCELLED, BriefStatus.SUBMITTED)).toBe(false);
    });
  });
});
