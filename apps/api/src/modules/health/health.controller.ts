import { Controller, Get, HttpCode, HttpStatus, Inject } from '@nestjs/common';
import { HealthService } from './health.service.js';
import { HealthResponse } from '@factorymatch/shared';

@Controller()
export class HealthController {
  constructor(@Inject(HealthService) private readonly healthService: HealthService) {}

  @Get('health')
  @HttpCode(HttpStatus.OK)
  async getHealth(): Promise<{ data: HealthResponse }> {
    const data = await this.healthService.checkHealth();
    return { data };
  }

  @Get('api/v1/health')
  @HttpCode(HttpStatus.OK)
  async getV1Health(): Promise<{ data: HealthResponse }> {
    const data = await this.healthService.checkHealth();
    return { data };
  }

  @Get('ready')
  @HttpCode(HttpStatus.OK)
  async getReady(): Promise<{ data: { ready: boolean; database: boolean } }> {
    const data = await this.healthService.checkReadiness();
    return { data };
  }
}
