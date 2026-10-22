import { Injectable, Logger } from '@nestjs/common';
import {
  AuthUser,
  Role,
  QuoteStatus,
  QuoteRequestStatus,
  CreateQuoteRequestDto,
  SubmitQuoteDto,
  QuoteDecisionDto,
  QuoteResponse,
  QuoteComparison,
  PaginationQuery,
} from '@factorymatch/shared';
import { QuotesRepository } from './quotes.repository.js';
import {
  canSubmitQuote,
  canDecideQuote,
  canTransitionQuote,
} from './quotes.policy.js';
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
  ValidationError,
} from '../../common/errors/app-error.js';

@Injectable()
export class QuotesService {
  private readonly logger = new Logger(QuotesService.name);

  constructor(private readonly repo: QuotesRepository) {}

  /**
   * Admin creates a quote request to a shortlisted factory for a brief.
   * Logs/enqueues notification event to factory.
   */
  async createQuoteRequest(adminUser: AuthUser, dto: CreateQuoteRequestDto) {
    if (adminUser.role !== Role.ADMIN) {
      throw new ForbiddenError('Only admins can create quote requests');
    }

    const brief = await this.repo.findBriefById(dto.briefId);
    if (!brief) {
      throw new NotFoundError('Brief not found');
    }

    const factory = await this.repo.findFactoryById(dto.factoryId);
    if (!factory) {
      throw new NotFoundError('Factory not found');
    }

    const expiresAt = new Date(dto.expiresAt);
    if (isNaN(expiresAt.getTime()) || expiresAt <= new Date()) {
      throw new ValidationError('Expiry date must be in the future');
    }

    const quoteRequest = await this.repo.createQuoteRequest(
      dto.briefId,
      dto.factoryId,
      expiresAt,
    );

    // Enqueue factory notification event
    this.logger.log(
      `[Event:QuoteRequestCreated] Enqueued notification for factory ${factory.id} on quote request ${quoteRequest.id}`,
    );

    return quoteRequest;
  }

  /**
   * Factory submits a quote against an incoming quote request.
   * Updates request status to SUBMITTED.
   */
  async submitQuote(factoryUser: AuthUser, dto: SubmitQuoteDto): Promise<QuoteResponse> {
    if (factoryUser.role !== Role.FACTORY || !factoryUser.factoryId) {
      throw new ForbiddenError('Only factory accounts can submit quotes');
    }

    const quoteRequest = await this.repo.findQuoteRequestById(dto.quoteRequestId);

    // Return 404 (not 403) to prevent IDOR and information leakage
    if (!quoteRequest || quoteRequest.factoryId !== factoryUser.factoryId) {
      throw new NotFoundError('Quote request not found');
    }

    if (new Date() > new Date(quoteRequest.expiresAt)) {
      throw new ConflictError('Quote request has expired');
    }

    if (!canSubmitQuote(factoryUser, quoteRequest)) {
      throw new ConflictError('Quote request is not open for submission');
    }

    const validUntil = new Date(dto.validUntil);
    if (isNaN(validUntil.getTime()) || validUntil <= new Date()) {
      throw new ValidationError('Quote validity date must be in the future');
    }

    const quote = await this.repo.createQuote(dto.quoteRequestId, dto);
    await this.repo.updateQuoteRequestStatus(
      dto.quoteRequestId,
      QuoteRequestStatus.SUBMITTED,
    );

    this.logger.log(
      `[Event:QuoteSubmitted] Factory ${factoryUser.factoryId} submitted quote ${quote.id} for brief ${quoteRequest.briefId}`,
    );

    return this.toQuoteResponse(quote);
  }

  /**
   * Brand comparison view: lists all submitted quotes for a brief side-by-side.
   * CRITICAL SECURITY: Factories must NEVER see competitor quotes.
   * Only the owning brand and admins can view this.
   */
  async getQuotesForBrief(user: AuthUser, briefId: string): Promise<QuoteComparison> {
    const brief = await this.repo.findBriefById(briefId);
    if (!brief) {
      throw new NotFoundError('Brief not found');
    }

    if (user.role === Role.FACTORY) {
      throw new ForbiddenError('Factories are not permitted to view quote comparison');
    }

    if (user.role === Role.BRAND) {
      // 404 if brand does not own the brief to avoid leaking existence
      if (!user.brandId || user.brandId !== brief.brandId) {
        throw new NotFoundError('Brief not found');
      }
    } else if (user.role !== Role.ADMIN) {
      throw new ForbiddenError('Access denied');
    }

    const quotes = await this.repo.findQuotesByBriefId(briefId);

    return {
      briefId: brief.id,
      briefProductName: brief.productName,
      quotes: quotes.map((q) => this.toQuoteResponse(q)),
    };
  }

  /**
   * Owning brand accepts or rejects a quote.
   * Only one quote can be accepted per brief.
   */
  async decideQuote(brandUser: AuthUser, dto: QuoteDecisionDto): Promise<QuoteResponse> {
    if (brandUser.role !== Role.BRAND || !brandUser.brandId) {
      throw new ForbiddenError('Only brands can decide on quotes');
    }

    const quote = await this.repo.findQuoteById(dto.quoteId);
    if (!quote) {
      throw new NotFoundError('Quote not found');
    }

    const brief = quote.quoteRequest?.brief;
    if (!brief || !canDecideQuote(brandUser, brief)) {
      throw new NotFoundError('Quote not found');
    }

    const targetStatus =
      dto.decision === 'ACCEPTED' ? QuoteStatus.ACCEPTED : QuoteStatus.REJECTED;

    if (!canTransitionQuote(quote.status, targetStatus)) {
      throw new ConflictError(
        `Cannot transition quote from ${quote.status} to ${targetStatus}`,
      );
    }

    // Only one quote can be accepted per brief
    if (dto.decision === 'ACCEPTED') {
      const existingAccepted = await this.repo.findAcceptedQuoteForBrief(brief.id);
      if (existingAccepted && existingAccepted.id !== quote.id) {
        throw new ConflictError(
          'Another quote has already been accepted for this brief',
        );
      }
    }

    const updatedQuote = await this.repo.decideQuoteTransaction(
      quote.id,
      brief.id,
      targetStatus,
    );

    this.logger.log(
      `[Event:QuoteDecided] Brand ${brandUser.brandId} marked quote ${quote.id} as ${dto.decision}`,
    );

    return this.toQuoteResponse(updatedQuote);
  }

  /**
   * Retrieves incoming quote requests for the authenticated factory.
   */
  async getQuoteRequestsForFactory(
    factoryUser: AuthUser,
    pagination?: PaginationQuery,
  ) {
    if (factoryUser.role !== Role.FACTORY || !factoryUser.factoryId) {
      throw new ForbiddenError('Only factory users can view factory quote requests');
    }

    return this.repo.findQuoteRequestsByFactoryId(
      factoryUser.factoryId,
      pagination,
    );
  }

  /**
   * Maps internal DB quote entity to shared QuoteResponse DTO.
   */
  private toQuoteResponse(quote: any): QuoteResponse {
    return {
      id: quote.id,
      quoteRequestId: quote.quoteRequestId,
      factoryId: quote.quoteRequest.factory.id,
      factoryName: quote.quoteRequest.factory.legalName,
      factoryCity: quote.quoteRequest.factory.city,
      factoryTier: quote.quoteRequest.factory.tier,
      pricePaisePerUnit: quote.pricePaisePerUnit,
      moqUnits: quote.moqUnits,
      leadTimeDays: quote.leadTimeDays,
      validUntil: quote.validUntil,
      termsJson: (quote.termsJson ?? {}) as Record<string, unknown>,
      status: quote.status as QuoteStatus,
      createdAt: quote.createdAt,
    };
  }
}
