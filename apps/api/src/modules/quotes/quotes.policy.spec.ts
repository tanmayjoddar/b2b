import { describe, it, expect } from 'vitest';
import {
  Role,
  UserStatus,
  QuoteRequestStatus,
  QuoteStatus,
  AuthUser,
} from '@factorymatch/shared';
import {
  canViewQuoteRequest,
  canSubmitQuote,
  canViewQuote,
  canDecideQuote,
  canTransitionQuoteRequest,
  canTransitionQuote,
} from './quotes.policy.js';

describe('QuotesPolicy', () => {
  const brandAUser: AuthUser = {
    id: 'usr-brand-a',
    email: 'brand-a@test.com',
    phone: null,
    role: Role.BRAND,
    status: UserStatus.ACTIVE,
    brandId: 'brand-a',
  };

  const brandBUser: AuthUser = {
    id: 'usr-brand-b',
    email: 'brand-b@test.com',
    phone: null,
    role: Role.BRAND,
    status: UserStatus.ACTIVE,
    brandId: 'brand-b',
  };

  const factoryAUser: AuthUser = {
    id: 'usr-factory-a',
    email: null,
    phone: '+919999900001',
    role: Role.FACTORY,
    status: UserStatus.ACTIVE,
    factoryId: 'factory-a',
  };

  const factoryBUser: AuthUser = {
    id: 'usr-factory-b',
    email: null,
    phone: '+919999900002',
    role: Role.FACTORY,
    status: UserStatus.ACTIVE,
    factoryId: 'factory-b',
  };

  const adminUser: AuthUser = {
    id: 'usr-admin',
    email: 'admin@factorymatch.com',
    phone: null,
    role: Role.ADMIN,
    status: UserStatus.ACTIVE,
  };

  describe('canViewQuoteRequest', () => {
    const requestForFactoryAOnBrandABrief = {
      id: 'qr-1',
      factoryId: 'factory-a',
      brief: { brandId: 'brand-a' },
    };

    it('allows the assigned factory to view its own quote request', () => {
      expect(canViewQuoteRequest(factoryAUser, requestForFactoryAOnBrandABrief)).toBe(true);
    });

    it('denies a different factory from viewing the quote request', () => {
      expect(canViewQuoteRequest(factoryBUser, requestForFactoryAOnBrandABrief)).toBe(false);
    });

    it('allows the brand owning the brief to view the quote request', () => {
      expect(canViewQuoteRequest(brandAUser, requestForFactoryAOnBrandABrief)).toBe(true);
    });

    it('denies a non-owning brand from viewing the quote request', () => {
      expect(canViewQuoteRequest(brandBUser, requestForFactoryAOnBrandABrief)).toBe(false);
    });

    it('allows an admin to view any quote request', () => {
      expect(canViewQuoteRequest(adminUser, requestForFactoryAOnBrandABrief)).toBe(true);
    });
  });

  describe('canSubmitQuote', () => {
    const futureDate = new Date(Date.now() + 86400000);
    const pastDate = new Date(Date.now() - 86400000);

    const validRequest = {
      factoryId: 'factory-a',
      status: QuoteRequestStatus.REQUESTED,
      expiresAt: futureDate,
    };

    it('allows the designated factory to submit when status is REQUESTED and not expired', () => {
      expect(canSubmitQuote(factoryAUser, validRequest)).toBe(true);
    });

    it('denies a different factory from submitting a quote', () => {
      expect(canSubmitQuote(factoryBUser, validRequest)).toBe(false);
    });

    it('denies submission if quote request is already SUBMITTED', () => {
      expect(
        canSubmitQuote(factoryAUser, {
          ...validRequest,
          status: QuoteRequestStatus.SUBMITTED,
        }),
      ).toBe(false);
    });

    it('denies submission if quote request is EXPIRED', () => {
      expect(
        canSubmitQuote(factoryAUser, {
          ...validRequest,
          status: QuoteRequestStatus.EXPIRED,
        }),
      ).toBe(false);
    });

    it('denies submission if quote request expiry date is in the past', () => {
      expect(
        canSubmitQuote(factoryAUser, {
          ...validRequest,
          expiresAt: pastDate,
        }),
      ).toBe(false);
    });

    it('denies brand users from submitting quotes', () => {
      expect(canSubmitQuote(brandAUser, validRequest)).toBe(false);
    });

    it('denies admin users without factoryId from submitting quotes', () => {
      expect(canSubmitQuote(adminUser, validRequest)).toBe(false);
    });
  });

  describe('canViewQuote - Critical Security Isolation', () => {
    const quoteFromFactoryA = {
      id: 'quote-1',
      factoryId: 'factory-a',
      quoteRequest: {
        factoryId: 'factory-a',
        brief: { brandId: 'brand-a' },
      },
    };

    it('allows Factory A to view its own submitted quote', () => {
      expect(canViewQuote(factoryAUser, quoteFromFactoryA)).toBe(true);
    });

    it('CRITICAL: Factory B can NEVER see Factory A quote (competitor isolation)', () => {
      expect(canViewQuote(factoryBUser, quoteFromFactoryA)).toBe(false);
    });

    it('allows owning Brand A to view quotes submitted for its brief', () => {
      expect(canViewQuote(brandAUser, quoteFromFactoryA, 'brand-a')).toBe(true);
    });

    it('CRITICAL: Brand B can NEVER see quotes submitted for Brand A brief', () => {
      expect(canViewQuote(brandBUser, quoteFromFactoryA, 'brand-a')).toBe(false);
    });

    it('allows Admin to view any quote', () => {
      expect(canViewQuote(adminUser, quoteFromFactoryA)).toBe(true);
    });
  });

  describe('canDecideQuote', () => {
    const briefBrandA = { id: 'brief-1', brandId: 'brand-a' };

    it('allows the owning brand to accept or reject quote', () => {
      expect(canDecideQuote(brandAUser, briefBrandA)).toBe(true);
    });

    it('denies non-owning brand from deciding quote', () => {
      expect(canDecideQuote(brandBUser, briefBrandA)).toBe(false);
    });

    it('denies factories from deciding quotes', () => {
      expect(canDecideQuote(factoryAUser, briefBrandA)).toBe(false);
    });

    it('denies admins from deciding quotes (brand sole decision)', () => {
      expect(canDecideQuote(adminUser, briefBrandA)).toBe(false);
    });
  });

  describe('State Transitions', () => {
    it('validates legal transitions for QuoteRequest', () => {
      expect(canTransitionQuoteRequest(QuoteRequestStatus.REQUESTED, QuoteRequestStatus.SUBMITTED)).toBe(true);
      expect(canTransitionQuoteRequest(QuoteRequestStatus.REQUESTED, QuoteRequestStatus.EXPIRED)).toBe(true);
      expect(canTransitionQuoteRequest(QuoteRequestStatus.REQUESTED, QuoteRequestStatus.WITHDRAWN)).toBe(true);
      expect(canTransitionQuoteRequest(QuoteRequestStatus.SUBMITTED, QuoteRequestStatus.ACCEPTED)).toBe(true);
      expect(canTransitionQuoteRequest(QuoteRequestStatus.SUBMITTED, QuoteRequestStatus.REJECTED)).toBe(true);
    });

    it('rejects illegal transitions for QuoteRequest', () => {
      expect(canTransitionQuoteRequest(QuoteRequestStatus.ACCEPTED, QuoteRequestStatus.SUBMITTED)).toBe(false);
      expect(canTransitionQuoteRequest(QuoteRequestStatus.REJECTED, QuoteRequestStatus.ACCEPTED)).toBe(false);
      expect(canTransitionQuoteRequest(QuoteRequestStatus.EXPIRED, QuoteRequestStatus.SUBMITTED)).toBe(false);
    });

    it('validates legal transitions for Quote', () => {
      expect(canTransitionQuote(QuoteStatus.SUBMITTED, QuoteStatus.ACCEPTED)).toBe(true);
      expect(canTransitionQuote(QuoteStatus.SUBMITTED, QuoteStatus.REJECTED)).toBe(true);
      expect(canTransitionQuote(QuoteStatus.SUBMITTED, QuoteStatus.EXPIRED)).toBe(true);
      expect(canTransitionQuote(QuoteStatus.SUBMITTED, QuoteStatus.WITHDRAWN)).toBe(true);
    });

    it('rejects illegal transitions for Quote', () => {
      expect(canTransitionQuote(QuoteStatus.ACCEPTED, QuoteStatus.SUBMITTED)).toBe(false);
      expect(canTransitionQuote(QuoteStatus.ACCEPTED, QuoteStatus.REJECTED)).toBe(false);
      expect(canTransitionQuote(QuoteStatus.REJECTED, QuoteStatus.ACCEPTED)).toBe(false);
    });
  });
});
