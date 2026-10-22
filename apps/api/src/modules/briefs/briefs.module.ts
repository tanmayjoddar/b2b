import { Module } from '@nestjs/common';
import { BriefsController } from './briefs.controller.js';
import { BriefsService } from './briefs.service.js';
import { BriefsRepository } from './briefs.repository.js';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';

@Module({
  controllers: [BriefsController],
  providers: [BriefsService, BriefsRepository, AuthGuard, RolesGuard],
  exports: [BriefsService, BriefsRepository],
})
export class BriefsModule {}
