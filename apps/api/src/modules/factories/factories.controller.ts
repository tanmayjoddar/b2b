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
  AddCapabilityDto,
  AddCapabilitySchema,
  AuthUser,
  CreateFactoryProfileDto,
  CreateFactoryProfileSchema,
  FactoryStatus,
  Role,
  SubmitCertificateDto,
  SubmitCertificateSchema,
  VerificationTier,
} from '@factorymatch/shared';
import { FactoriesService } from './factories.service.js';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';

@Controller('api/v1/factories')
@UseGuards(AuthGuard, RolesGuard)
export class FactoriesController {
  constructor(private readonly factoriesService: FactoriesService) {}

  /**
   * Registers a new factory profile. Restricted to FACTORY role.
   */
  @Post()
  @Roles(Role.FACTORY)
  @HttpCode(HttpStatus.CREATED)
  async createProfile(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(CreateFactoryProfileSchema)) dto: CreateFactoryProfileDto,
  ) {
    const factory = await this.factoriesService.createProfile(user, dto);
    return { data: factory };
  }

  /**
   * Retrieves a factory profile by ID.
   * Brands see public profile only; owner factory and admins see full profile.
   */
  @Get(':id')
  async getProfile(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    const factory = await this.factoriesService.getProfile(user, id);
    return { data: factory };
  }

  /**
   * Lists factories directory with filtering and cursor pagination.
   */
  @Get()
  async listFactories(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: FactoryStatus,
    @Query('tier') tier?: VerificationTier,
    @Query('city') city?: string,
    @Query('state') state?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : undefined;
    const result = await this.factoriesService.listFactories(
      user,
      { status, tier, city, state },
      { cursor, limit: parsedLimit },
    );
    return { data: result };
  }

  /**
   * Adds manufacturing capability to factory profile. Restricted to FACTORY role.
   */
  @Post(':id/capabilities')
  @Roles(Role.FACTORY)
  @HttpCode(HttpStatus.CREATED)
  async addCapability(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(AddCapabilitySchema)) dto: AddCapabilityDto,
  ) {
    const capability = await this.factoriesService.addCapability(user, id, dto);
    return { data: capability };
  }

  /**
   * Submits compliance/quality certificate. Restricted to FACTORY role.
   */
  @Post(':id/certificates')
  @Roles(Role.FACTORY)
  @HttpCode(HttpStatus.CREATED)
  async submitCertificate(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(SubmitCertificateSchema)) dto: SubmitCertificateDto,
  ) {
    const certificate = await this.factoriesService.submitCertificate(user, id, dto);
    return { data: certificate };
  }
}
