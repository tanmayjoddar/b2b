import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { AuditLogQueryDto, AuditLogQuerySchema, Role } from '@factorymatch/shared';
import { AuditService } from './audit.service.js';

@Controller('api/v1/admin/audit-logs')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AuditController {
  constructor(private readonly service: AuditService) {}

  @Get()
  async getAuditLogs(
    @Query(new ZodValidationPipe(AuditLogQuerySchema)) query: AuditLogQueryDto,
  ) {
    const data = await this.service.listAuditLogs(query);
    return { data };
  }
}
