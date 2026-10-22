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
import {
  AdminVerifyFactoryDto,
  AdminVerifyFactorySchema,
  AuthUser,
  Role,
} from '@factorymatch/shared';
import { VerificationService } from './verification.service.js';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';

@Controller('api/v1/admin/factories')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  /**
   * Verifies factory profile, updates verification tier & status, creates audit trail.
   * Admin only.
   */
  @Post(':factoryId/verify')
  @HttpCode(HttpStatus.OK)
  async verifyFactory(
    @CurrentUser() adminUser: AuthUser,
    @Param('factoryId') factoryId: string,
    @Body(new ZodValidationPipe(AdminVerifyFactorySchema)) dto: AdminVerifyFactoryDto,
  ) {
    const result = await this.verificationService.verifyFactory(adminUser, factoryId, dto);
    return { data: result };
  }

  /**
   * Retrieves full verification audit history for a factory.
   * Admin only.
   */
  @Get(':factoryId/verifications')
  async getVerifications(
    @CurrentUser() adminUser: AuthUser,
    @Param('factoryId') factoryId: string,
  ) {
    const result = await this.verificationService.getVerifications(adminUser, factoryId);
    return { data: result };
  }
}
