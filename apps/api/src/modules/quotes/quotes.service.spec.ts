import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QuotesService } from './quotes.service.js';
import { QuotesRepository } from './quotes.repository.js';
import {
  Role,
  UserStatus,
  QuoteRequestStatus,
  QuoteStatus,
  AuthUser,
  VerificationTier,
} from '@factorymatch/shared';
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
  ValidationError,
} from '../../common/errors/app-error.js';

describe('QuotesService', () => {
  let service: QuotesService;
  let mockRepo: any;

  const adminUser: AuthUser = {
    id: 'usr-admin',
    email: 'admin@factorymatch.com',
    phone: null,
    role: Role.ADMIN,
    status: UserStatus.ACTIVE,
  };

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

  beforeEach(() => {
    mockRepo = {
      createQuoteRequest: vi.fn(),
      findQuoteRequestById: vi.fn(),
      findQuoteRequestsByBriefId: vi.fn(),
      findQuoteRequestsByFactoryId: vi.fn(),
      createQuote: vi.fn(),
      findQuoteById: vi.fn(),
      findQuotesByBriefId: vi.fn(),
      updateQuoteStatus: vi.fn(),
      updateQuoteRequestStatus: vi.fn(),
      findBriefById: vi.fn(),
      findFactoryById: vi.fn(),
      findAcceptedQuoteForBrief: vi.fn(),
      decideQuoteTransaction: vi.fn(),
    };

    service = new QuotesService(mockRepo as unknown as QuotesRepository);
  });

  describe('createQuoteRequest', () => {
    const futureExpiry = new Date(Date.now() + 7 * 86400000).toISOString();
    const dto = {
      briefId: 'brief-1',
      factoryId: 'factory-a',
      expiresAt: futureExpiry,
    };

    it('allows admin to create quote request and enqueues notification', async () => {
      mockRepo.findBriefById.mockResolvedValue({ id: 'brief-1', brandId: 'brand-a' });
      mockRepo.findFactoryById.mockResolvedValue({ id: 'factory-a', legalName: 'Alpha Foods' });
      mockRepo.createQuoteRequest.mockResolvedValue({
        id: 'qr-1',
        briefId: 'brief-1',
        factoryId: 'factory-a',
        status: QuoteRequestStatus.REQUESTED,
        expiresAt: new Date(futureExpiry),
      });

      const result = await service.createQuoteRequest(adminUser, dto);

      expect(result.id).toBe('qr-1');
      expect(mockRepo.createQuoteRequest).toHaveBeenCalledWith(
        'brief-1',
        'factory-a',
        expect.any(Date),
      );
    });

    it('rejects non-admin users with ForbiddenError', async () => {
      await expect(service.createQuoteRequest(brandAUser, dto)).rejects.toThrow(ForbiddenError);
      await expect(service.createQuoteRequest(factoryAUser, dto)).rejects.toThrow(ForbiddenError);
    });

    it('rejects if brief does not exist with NotFoundError', async () => {
      mockRepo.findBriefById.mockResolvedValue(null);

      await expect(service.createQuoteRequest(adminUser, dto)).rejects.toThrow(NotFoundError);
    });

    it('rejects if factory does not exist with NotFoundError', async () => {
      mockRepo.findBriefById.mockResolvedValue({ id: 'brief-1' });
      mockRepo.findFactoryById.mockResolvedValue(null);

      await expect(service.createQuoteRequest(adminUser, dto)).rejects.toThrow(NotFoundError);
    });

    it('rejects if expiresAt is in the past with ValidationError', async () => {
      mockRepo.findBriefById.mockResolvedValue({ id: 'brief-1' });
      mockRepo.findFactoryById.mockResolvedValue({ id: 'factory-a' });

      const pastDto = {
        ...dto,
        expiresAt: new Date(Date.now() - 86400000).toISOString(),
      };

      await expect(service.createQuoteRequest(adminUser, pastDto)).rejects.toThrow(ValidationError);
    });

    it('rejects duplicate quote request with ConflictError', async () => {
      mockRepo.findBriefById.mockResolvedValue({ id: 'brief-1' });
      mockRepo.findFactoryById.mockResolvedValue({ id: 'factory-a' });
      mockRepo.createQuoteRequest.mockRejectedValue(
        new ConflictError('A quote request already exists for this factory and brief'),
      );

      await expect(service.createQuoteRequest(adminUser, dto)).rejects.toThrow(ConflictError);
    });
  });

  describe('submitQuote', () => {
    const futureExpiry = new Date(Date.now() + 7 * 86400000);
    const futureValidUntil = new Date(Date.now() + 14 * 86400000).toISOString();

    const submitDto = {
      quoteRequestId: 'qr-1',
      pricePaisePerUnit: 1250, // 12.50 INR in paise
      moqUnits: 5000,
      leadTimeDays: 21,
      validUntil: futureValidUntil,
      termsJson: { paymentTerms: '50% advance, 50% on dispatch' },
    };

    const mockQuoteRequest = {
      id: 'qr-1',
      briefId: 'brief-1',
      factoryId: 'factory-a',
      status: QuoteRequestStatus.REQUESTED,
      expiresAt: futureExpiry,
    };

    it('allows designated factory to submit quote and transitions request status', async () => {
      mockRepo.findQuoteRequestById.mockResolvedValue(mockQuoteRequest);
      mockRepo.createQuote.mockResolvedValue({
        id: 'quote-1',
        quoteRequestId: 'qr-1',
        pricePaisePerUnit: 1250,
        moqUnits: 5000,
        leadTimeDays: 21,
        validUntil: new Date(futureValidUntil),
        termsJson: submitDto.termsJson,
        status: QuoteStatus.SUBMITTED,
        createdAt: new Date(),
        quoteRequest: {
          factory: {
            id: 'factory-a',
            legalName: 'Alpha Foods',
            city: 'Pune',
            tier: VerificationTier.TIER_2_VIDEO,
          },
        },
      });

      const result = await service.submitQuote(factoryAUser, submitDto);

      expect(result.id).toBe('quote-1');
      expect(result.pricePaisePerUnit).toBe(1250);
      expect(result.factoryName).toBe('Alpha Foods');
      expect(mockRepo.updateQuoteRequestStatus).toHaveBeenCalledWith(
        'qr-1',
        QuoteRequestStatus.SUBMITTED,
      );
    });

    it('CRITICAL: Returns 404 NotFoundError when Factory B tries to submit for Factory A request (avoids leaking existence)', async () => {
      mockRepo.findQuoteRequestById.mockResolvedValue(mockQuoteRequest);

      await expect(service.submitQuote(factoryBUser, submitDto)).rejects.toThrow(NotFoundError);
    });

    it('rejects submission from non-factory user with ForbiddenError', async () => {
      await expect(service.submitQuote(brandAUser, submitDto)).rejects.toThrow(ForbiddenError);
    });

    it('rejects submission if quote request has expired with ConflictError', async () => {
      mockRepo.findQuoteRequestById.mockResolvedValue({
        ...mockQuoteRequest,
        expiresAt: new Date(Date.now() - 86400000),
      });

      await expect(service.submitQuote(factoryAUser, submitDto)).rejects.toThrow(ConflictError);
    });

    it('rejects submission if quote request is not in REQUESTED status with ConflictError', async () => {
      mockRepo.findQuoteRequestById.mockResolvedValue({
        ...mockQuoteRequest,
        status: QuoteRequestStatus.SUBMITTED,
      });

      await expect(service.submitQuote(factoryAUser, submitDto)).rejects.toThrow(ConflictError);
    });

    it('rejects past validUntil date with ValidationError', async () => {
      mockRepo.findQuoteRequestById.mockResolvedValue(mockQuoteRequest);

      const pastValidDto = {
        ...submitDto,
        validUntil: new Date(Date.now() - 86400000).toISOString(),
      };

      await expect(service.submitQuote(factoryAUser, pastValidDto)).rejects.toThrow(ValidationError);
    });
  });

  describe('getQuotesForBrief - Brand Comparison View', () => {
    const briefA = {
      id: 'brief-1',
      brandId: 'brand-a',
      productName: 'Protein Chips 50g',
    };

    const mockQuotes = [
      {
        id: 'quote-1',
        quoteRequestId: 'qr-1',
        pricePaisePerUnit: 1200,
        moqUnits: 5000,
        leadTimeDays: 14,
        validUntil: new Date(Date.now() + 86400000),
        termsJson: {},
        status: QuoteStatus.SUBMITTED,
        createdAt: new Date(),
        quoteRequest: {
          factory: {
            id: 'factory-a',
            legalName: 'Alpha Foods',
            city: 'Pune',
            tier: VerificationTier.TIER_2_VIDEO,
          },
        },
      },
      {
        id: 'quote-2',
        quoteRequestId: 'qr-2',
        pricePaisePerUnit: 1400,
        moqUnits: 3000,
        leadTimeDays: 10,
        validUntil: new Date(Date.now() + 86400000),
        termsJson: {},
        status: QuoteStatus.SUBMITTED,
        createdAt: new Date(),
        quoteRequest: {
          factory: {
            id: 'factory-b',
            legalName: 'Beta Nutrition',
            city: 'Bengaluru',
            tier: VerificationTier.TIER_3_ORDER_PROVEN,
          },
        },
      },
    ];

    it('allows owning Brand A to view side-by-side comparison of quotes on its brief', async () => {
      mockRepo.findBriefById.mockResolvedValue(briefA);
      mockRepo.findQuotesByBriefId.mockResolvedValue(mockQuotes);

      const result = await service.getQuotesForBrief(brandAUser, 'brief-1');

      expect(result.briefId).toBe('brief-1');
      expect(result.briefProductName).toBe('Protein Chips 50g');
      expect(result.quotes).toHaveLength(2);
      expect(result.quotes[0].pricePaisePerUnit).toBe(1200);
      expect(result.quotes[1].pricePaisePerUnit).toBe(1400);
    });

    it('CRITICAL: Factory can NEVER view the quote comparison view', async () => {
      mockRepo.findBriefById.mockResolvedValue(briefA);

      await expect(service.getQuotesForBrief(factoryAUser, 'brief-1')).rejects.toThrow(
        ForbiddenError,
      );
    });

    it('CRITICAL: Brand B gets 404 NotFoundError on Brand A brief comparison (no existence leakage)', async () => {
      mockRepo.findBriefById.mockResolvedValue(briefA);

      await expect(service.getQuotesForBrief(brandBUser, 'brief-1')).rejects.toThrow(
        NotFoundError,
      );
    });

    it('allows Admin to view quotes for any brief', async () => {
      mockRepo.findBriefById.mockResolvedValue(briefA);
      mockRepo.findQuotesByBriefId.mockResolvedValue(mockQuotes);

      const result = await service.getQuotesForBrief(adminUser, 'brief-1');

      expect(result.quotes).toHaveLength(2);
    });
  });

  describe('decideQuote', () => {
    const mockQuote = {
      id: 'quote-1',
      quoteRequestId: 'qr-1',
      pricePaisePerUnit: 1200,
      moqUnits: 5000,
      leadTimeDays: 14,
      validUntil: new Date(Date.now() + 86400000),
      termsJson: {},
      status: QuoteStatus.SUBMITTED,
      createdAt: new Date(),
      quoteRequest: {
        brief: {
          id: 'brief-1',
          brandId: 'brand-a',
        },
        factory: {
          id: 'factory-a',
          legalName: 'Alpha Foods',
          city: 'Pune',
          tier: VerificationTier.TIER_2_VIDEO,
        },
      },
    };

    it('allows owning brand to ACCEPT a quote, rejecting other quotes atomically', async () => {
      mockRepo.findQuoteById.mockResolvedValue(mockQuote);
      mockRepo.findAcceptedQuoteForBrief.mockResolvedValue(null);
      mockRepo.decideQuoteTransaction.mockResolvedValue({
        ...mockQuote,
        status: QuoteStatus.ACCEPTED,
      });

      const result = await service.decideQuote(brandAUser, {
        quoteId: 'quote-1',
        decision: 'ACCEPTED',
      });

      expect(result.status).toBe(QuoteStatus.ACCEPTED);
      expect(mockRepo.decideQuoteTransaction).toHaveBeenCalledWith(
        'quote-1',
        'brief-1',
        QuoteStatus.ACCEPTED,
      );
    });

    it('allows owning brand to REJECT a quote', async () => {
      mockRepo.findQuoteById.mockResolvedValue(mockQuote);
      mockRepo.decideQuoteTransaction.mockResolvedValue({
        ...mockQuote,
        status: QuoteStatus.REJECTED,
      });

      const result = await service.decideQuote(brandAUser, {
        quoteId: 'quote-1',
        decision: 'REJECTED',
        reason: 'Price is too high',
      });

      expect(result.status).toBe(QuoteStatus.REJECTED);
      expect(mockRepo.decideQuoteTransaction).toHaveBeenCalledWith(
        'quote-1',
        'brief-1',
        QuoteStatus.REJECTED,
      );
    });

    it('CRITICAL: Non-owning Brand B gets 404 NotFoundError when attempting to decide Brand A quote', async () => {
      mockRepo.findQuoteById.mockResolvedValue(mockQuote);

      await expect(
        service.decideQuote(brandBUser, {
          quoteId: 'quote-1',
          decision: 'ACCEPTED',
        }),
      ).rejects.toThrow(NotFoundError);
    });

    it('rejects factories from deciding quotes with ForbiddenError', async () => {
      await expect(
        service.decideQuote(factoryAUser, {
          quoteId: 'quote-1',
          decision: 'ACCEPTED',
        }),
      ).rejects.toThrow(ForbiddenError);
    });

    it('rejects accepting a quote if another quote has already been accepted for the brief', async () => {
      mockRepo.findQuoteById.mockResolvedValue(mockQuote);
      mockRepo.findAcceptedQuoteForBrief.mockResolvedValue({
        id: 'quote-other',
        status: QuoteStatus.ACCEPTED,
      });

      await expect(
        service.decideQuote(brandAUser, {
          quoteId: 'quote-1',
          decision: 'ACCEPTED',
        }),
      ).rejects.toThrow(ConflictError);
    });

    it('rejects decision if quote is already in terminal ACCEPTED status with ConflictError', async () => {
      mockRepo.findQuoteById.mockResolvedValue({
        ...mockQuote,
        status: QuoteStatus.ACCEPTED,
      });

      await expect(
        service.decideQuote(brandAUser, {
          quoteId: 'quote-1',
          decision: 'REJECTED',
        }),
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('getQuoteRequestsForFactory', () => {
    it('returns quote requests for the authenticated factory', async () => {
      const mockRequests = [
        {
          id: 'qr-1',
          briefId: 'brief-1',
          factoryId: 'factory-a',
          status: QuoteRequestStatus.REQUESTED,
          brief: { productName: 'Snack Bar' },
        },
      ];
      mockRepo.findQuoteRequestsByFactoryId.mockResolvedValue(mockRequests);

      const result = await service.getQuoteRequestsForFactory(factoryAUser);

      expect(result).toHaveLength(1);
      expect(mockRepo.findQuoteRequestsByFactoryId).toHaveBeenCalledWith(
        'factory-a',
        undefined,
      );
    });

    it('rejects non-factory user with ForbiddenError', async () => {
      await expect(service.getQuoteRequestsForFactory(brandAUser)).rejects.toThrow(
        ForbiddenError,
      );
    });
  });
});
