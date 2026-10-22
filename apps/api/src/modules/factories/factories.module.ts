import { Module } from '@nestjs/common';
import { FactoriesController } from './factories.controller.js';
import { FactoriesService } from './factories.service.js';
import { FactoriesRepository } from './factories.repository.js';

@Module({
  controllers: [FactoriesController],
  providers: [FactoriesService, FactoriesRepository],
  exports: [FactoriesService, FactoriesRepository],
})
export class FactoriesModule {}
