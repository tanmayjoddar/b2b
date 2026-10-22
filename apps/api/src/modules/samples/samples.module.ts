import { Module } from '@nestjs/common';
import { SamplesController } from './samples.controller.js';
import { SamplesService } from './samples.service.js';
import { SamplesRepository } from './samples.repository.js';
import { PrismaModule } from '../../infra/prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [SamplesController],
  providers: [SamplesService, SamplesRepository],
  exports: [SamplesService, SamplesRepository],
})
export class SamplesModule {}
