import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  AdminVerifyFactoryDto,
  FactoryStatus,
  VerificationTier,
} from '@factorymatch/shared';
import { PrismaService } from '../../infra/prisma/prisma.service.js';

@Injectable()
export class VerificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Finds a factory by ID for verification inspection
   */
  async findFactoryById(id: string) {
    return this.prisma.factory.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        capabilities: true,
        certificates: true,
        verifications: true,
      },
    });
  }

  /**
   * Creates a standalone verification record
   */
  async createVerification(factoryId: string, dto: AdminVerifyFactoryDto, adminId: string) {
    return this.prisma.verification.create({
      data: {
        factoryId,
        tier: dto.tier,
        method: dto.method,
        result: dto.result,
        evidenceFileId: dto.evidenceFileId || null,
        notes: dto.notes || null,
        performedBy: adminId,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
    });
  }

  /**
   * Retrieves all verification audit history for a given factory
   */
  async findByFactoryId(factoryId: string) {
    return this.prisma.verification.findMany({
      where: { factoryId },
      orderBy: { performedAt: 'desc' },
    });
  }

  /**
   * Atomically executes verification:
   * 1. Creates Verification record
   * 2. Updates Factory tier and status
   * 3. Creates immutable AuditLog entry
   */
  async executeVerificationTx(params: {
    factoryId: string;
    dto: AdminVerifyFactoryDto;
    adminId: string;
    beforeFactory: { status: FactoryStatus; tier: VerificationTier };
  }) {
    return this.prisma.$transaction(async (tx) => {
      const verification = await tx.verification.create({
        data: {
          factoryId: params.factoryId,
          tier: params.dto.tier,
          method: params.dto.method,
          result: params.dto.result,
          evidenceFileId: params.dto.evidenceFileId || null,
          notes: params.dto.notes || null,
          performedBy: params.adminId,
          expiresAt: params.dto.expiresAt ? new Date(params.dto.expiresAt) : null,
        },
      });

      const updatedFactory = await tx.factory.update({
        where: { id: params.factoryId },
        data: {
          tier: params.dto.tier,
          status: params.dto.newStatus,
        },
      });

      const auditLog = await tx.auditLog.create({
        data: {
          actorUserId: params.adminId,
          action: 'FACTORY_VERIFIED',
          entityType: 'Factory',
          entityId: params.factoryId,
          beforeJson: {
            status: params.beforeFactory.status,
            tier: params.beforeFactory.tier,
          } as Prisma.InputJsonValue,
          afterJson: {
            status: params.dto.newStatus,
            tier: params.dto.tier,
            verificationResult: params.dto.result,
            verificationMethod: params.dto.method,
            verificationId: verification.id,
          } as Prisma.InputJsonValue,
        },
      });

      return {
        verification,
        factory: updatedFactory,
        auditLog,
      };
    });
  }
}
