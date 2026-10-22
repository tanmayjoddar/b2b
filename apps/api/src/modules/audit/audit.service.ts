import { Injectable } from '@nestjs/common';
import { AuditRepository } from './audit.repository.js';
import { AuditLogQueryDto } from '@factorymatch/shared';

@Injectable()
export class AuditService {
  constructor(private readonly repo: AuditRepository) {}

  async listAuditLogs(query: AuditLogQueryDto) {
    return this.repo.listAuditLogs(query);
  }
}
