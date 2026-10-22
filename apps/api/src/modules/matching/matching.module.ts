import { Module } from '@nestjs/common';
import { MatchingController } from './matching.controller.js';
import { MatchingService } from './matching.service.js';
import { MatchingRepository } from './matching.repository.js';
import { BriefsModule } from '../briefs/briefs.module.js';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';

@Module({
  imports: [BriefsModule],
  controllers: [MatchingController],
  providers: [MatchingService, MatchingRepository, AuthGuard, RolesGuard],
  exports: [MatchingService, MatchingRepository],
})
export class MatchingModule {}
