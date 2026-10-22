import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  Role,
  AuthUser,
  CreateSampleSchema,
  CreateSampleDto,
  TransitionSampleSchema,
  TransitionSampleDto,
  PaginationQuerySchema,
  PaginationQuery,
} from '@factorymatch/shared';
import { SamplesService } from './samples.service.js';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';

@Controller('api/v1/samples')
@UseGuards(AuthGuard, RolesGuard)
export class SamplesController {
  constructor(private readonly samplesService: SamplesService) {}

  /**
   * POST /api/v1/samples
   * Creates a sample request. Initiated by brands or admins.
   */
  @Post()
  @Roles(Role.BRAND, Role.ADMIN)
  async create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(CreateSampleSchema)) dto: CreateSampleDto,
  ) {
    const sample = await this.samplesService.createSample(user, dto);
    return { data: sample };
  }

  /**
   * GET /api/v1/samples
   * Lists samples accessible to the authenticated user.
   */
  @Get()
  @Roles(Role.BRAND, Role.FACTORY, Role.ADMIN)
  async list(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(PaginationQuerySchema)) pagination: PaginationQuery,
  ) {
    const samples = await this.samplesService.listForUser(user, pagination);
    return { data: samples };
  }

  /**
   * GET /api/v1/samples/:id
   * Retrieves single sample details with ownership verification.
   */
  @Get(':id')
  @Roles(Role.BRAND, Role.FACTORY, Role.ADMIN)
  async get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const sample = await this.samplesService.getForUser(user, id);
    return { data: sample };
  }

  /**
   * POST /api/v1/samples/:id/transition
   * Executes a state machine transition on a sample.
   */
  @Post(':id/transition')
  @Roles(Role.BRAND, Role.FACTORY, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async transition(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(TransitionSampleSchema)) dto: TransitionSampleDto,
  ) {
    const updated = await this.samplesService.transition(
      user,
      id,
      dto.toStatus,
      dto.trackingRef,
      dto.brandFeedback,
    );
    return { data: updated };
  }
}
