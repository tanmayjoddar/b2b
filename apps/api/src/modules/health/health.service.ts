import { Injectable } from '@nestjs/common';
import { HealthResponse } from '@factorymatch/shared';
import { PrismaService } from '../../infra/prisma/prisma.service.js';

@Injectable()
export class HealthService {
  private readonly startTime = Date.now();

  constructor(private readonly prisma: PrismaService) {}

  async checkHealth(): Promise<HealthResponse> {
    const isDbConnected = await this.prisma.isHealthy();

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'factorymatch-api',
      version: '0.1.0',
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
      details: {
        database: isDbConnected ? 'connected' : 'disconnected',
      },
    };
  }

  async checkReadiness(): Promise<{ ready: boolean; database: boolean }> {
    const isDbConnected = await this.prisma.isHealthy();
    return {
      ready: isDbConnected,
      database: isDbConnected,
    };
  }
}
