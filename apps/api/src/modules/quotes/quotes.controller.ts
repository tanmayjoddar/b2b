import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  AuthUser,
  Role,
  CreateQuoteRequestSchema,
  SubmitQuoteSchema,
  SubmitQuoteDto,
  QuoteDecisionSchema,
  PaginationQuerySchema,
  PaginationQuery,
} from '@factorymatch/shared';
import { QuotesService } from './quotes.service.js';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';

@Controller('api/v1')
@UseGuards(AuthGuard, RolesGuard)
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  /**
   * Admin triggers quote requests to shortlisted factories for a brief.
   */
  @Post('admin/briefs/:briefId/quote-requests')
  @Roles(Role.ADMIN)
  async createQuoteRequest(
    @CurrentUser() user: AuthUser,
    @Param('briefId') briefId: string,
    @Body() body: unknown,
  ) {
    const raw = typeof body === 'object' && body !== null ? body : {};
    const dto = CreateQuoteRequestSchema.parse({
      ...raw,
      briefId: (raw as any).briefId ?? briefId,
    });
    const quoteRequest = await this.quotesService.createQuoteRequest(user, dto);
    return { data: quoteRequest };
  }

  /**
   * Factory views incoming quote requests assigned to their factory.
   */
  @Get('quote-requests/my')
  @Roles(Role.FACTORY)
  async getMyQuoteRequests(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(PaginationQuerySchema)) query: PaginationQuery,
  ) {
    const requests = await this.quotesService.getQuoteRequestsForFactory(user, query);
    return { data: requests };
  }

  /**
   * Factory submits a quote for an assigned quote request.
   */
  @Post('quotes')
  @Roles(Role.FACTORY)
  async submitQuote(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(SubmitQuoteSchema)) dto: SubmitQuoteDto,
  ) {
    const quote = await this.quotesService.submitQuote(user, dto);
    return { data: quote };
  }

  /**
   * Brand comparison view: compare all submitted factory quotes for a brief.
   * Admins can also inspect quotes for any brief.
   * Competitor factories can NEVER view this endpoint.
   */
  @Get('briefs/:briefId/quotes')
  @Roles(Role.BRAND, Role.ADMIN)
  async getQuotesForBrief(
    @CurrentUser() user: AuthUser,
    @Param('briefId') briefId: string,
  ) {
    const comparison = await this.quotesService.getQuotesForBrief(user, briefId);
    return { data: comparison };
  }

  /**
   * Brand accepts or rejects a quote for their brief.
   */
  @Post('quotes/:id/decide')
  @Roles(Role.BRAND)
  async decideQuote(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const raw = typeof body === 'object' && body !== null ? body : {};
    const dto = QuoteDecisionSchema.parse({
      ...raw,
      quoteId: (raw as any).quoteId ?? id,
    });
    const quote = await this.quotesService.decideQuote(user, dto);
    return { data: quote };
  }
}
