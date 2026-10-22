import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { AuditLogQueryDto } from '@factorymatch/shared';

@Injectable()
export class AuditRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listAuditLogs(query: AuditLogQueryDto) {
    const where: any = {};
    if (query.actorUserId) where.actorUserId = query.actorUserId;
    if (query.entityType) where.entityType = query.entityType;
    if (query.entityId) where.entityId = query.entityId;

    const [total, items] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        include: {
          actor: {
            select: {
              id: true,
              role: true,
              email: true,
              phone: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: query.limit,
        skip: query.offset,
      }),
    ]);

    return { total, items, limit: query.limit, offset: query.offset };
  }
}
