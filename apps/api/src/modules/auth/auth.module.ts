import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { AuthRepository } from './auth.repository.js';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';

@Module({
  controllers: [AuthController],
  providers: [AuthService, AuthRepository, AuthGuard, RolesGuard],
  exports: [AuthService, AuthRepository, AuthGuard, RolesGuard],
})
export class AuthModule {}
