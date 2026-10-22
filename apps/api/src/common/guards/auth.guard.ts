import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import jwt from 'jsonwebtoken';
import { UnauthorizedError } from '../errors/app-error.js';
import { AuthUser } from '@factorymatch/shared';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedError('Authentication token missing');
    }

    try {
      const secret = this.config.get<string>('JWT_ACCESS_SECRET');
      const payload = jwt.verify(token, secret!) as AuthUser;
      request.user = payload;
      return true;
    } catch (err) {
      throw new UnauthorizedError('Invalid or expired authentication token');
    }
  }

  private extractToken(request: any): string | null {
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    if (request.cookies && request.cookies.access_token) {
      return request.cookies.access_token;
    }
    return null;
  }
}
