import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { z } from 'zod';
import { AuthUser, Role } from '@factorymatch/shared';
import { MatchingService } from './matching.service.js';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';

const CreateShortlistPayloadSchema = z
  .object({
    briefId: z.string().optional(),
    factoryIds: z
      .array(z.string().min(1, 'Factory ID cannot be empty'))
      .min(1, 'At least 1 factory required')
      .max(5, 'Maximum 5 factories per shortlist'),
    notes: z.record(z.string(), z.string().max(500)).optional(),
  })
  .strict();

type CreateShortlistPayload = z.infer<typeof CreateShortlistPayloadSchema>;

@Controller('api/v1')
@UseGuards(AuthGuard, RolesGuard)
export class MatchingController {
  constructor(private readonly matchingService: MatchingService) {}

  /**
   * Admin creates a shortlist for a brief.
   * Transitions brief to SHORTLISTED.
   */
  @Post('admin/briefs/:briefId/shortlist')
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.ADMIN)
  async createShortlist(
    @CurrentUser() user: AuthUser,
    @Param('briefId') briefId: string,
    @Body(new ZodValidationPipe(CreateShortlistPayloadSchema))
    body: CreateShortlistPayload,
  ) {
    const shortlist = await this.matchingService.createShortlist(user, {
      briefId,
      factoryIds: body.factoryIds,
      notes: body.notes,
    });
    return { data: shortlist };
  }

  /**
   * View shortlist for a brief.
   * Accessible by ADMIN and the BRAND owning the brief.
   */
  @Get('briefs/:briefId/shortlist')
  @Roles(Role.BRAND, Role.ADMIN)
  async getShortlist(
    @CurrentUser() user: AuthUser,
    @Param('briefId') briefId: string,
  ) {
    const shortlist = await this.matchingService.getShortlistForUser(user, briefId);
    return { data: shortlist };
  }
}
