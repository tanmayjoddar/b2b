import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  AuthUser,
  BriefResponse,
  CreateBriefDto,
  CreateBriefSchema,
  PaginationQuery,
  PaginationQuerySchema,
  Role,
  UpdateBriefDto,
  UpdateBriefSchema,
} from '@factorymatch/shared';
import { BriefsService } from './briefs.service.js';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';

export function toBriefResponse(brief: any): BriefResponse {
  return {
    id: brief.id,
    brandId: brief.brandId,
    verticalId: brief.verticalId,
    productName: brief.productName,
    quantityUnits: brief.quantityUnits,
    targetPricePaiseMin: brief.targetPricePaiseMin ?? null,
    targetPricePaiseMax: brief.targetPricePaiseMax ?? null,
    requirementsJson: (brief.requirementsJson ?? {}) as Record<string, unknown>,
    timelineWeeks: brief.timelineWeeks,
    status: brief.status,
    createdAt: brief.createdAt,
    updatedAt: brief.updatedAt,
  };
}

@Controller('api/v1/briefs')
@UseGuards(AuthGuard, RolesGuard)
export class BriefsController {
  constructor(private readonly briefsService: BriefsService) {}

  @Post()
  @Roles(Role.BRAND)
  async create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(CreateBriefSchema)) dto: CreateBriefDto,
  ) {
    const brief = await this.briefsService.create(user, dto);
    return { data: toBriefResponse(brief) };
  }

  @Get()
  @Roles(Role.BRAND, Role.FACTORY, Role.ADMIN)
  async list(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(PaginationQuerySchema)) query: PaginationQuery,
  ) {
    const briefs = await this.briefsService.listForUser(user, query);
    return { data: briefs.map(toBriefResponse) };
  }

  @Get(':id')
  @Roles(Role.BRAND, Role.FACTORY, Role.ADMIN)
  async get(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    const brief = await this.briefsService.getForUser(user, id);
    return { data: toBriefResponse(brief) };
  }

  @Patch(':id')
  @Roles(Role.BRAND)
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateBriefSchema)) dto: UpdateBriefDto,
  ) {
    const brief = await this.briefsService.update(user, id, dto);
    return { data: toBriefResponse(brief) };
  }

  @Post(':id/submit')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.BRAND)
  async submit(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    const brief = await this.briefsService.submit(user, id);
    return { data: toBriefResponse(brief) };
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.BRAND, Role.ADMIN)
  async cancel(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    const brief = await this.briefsService.cancel(user, id);
    return { data: toBriefResponse(brief) };
  }
}
