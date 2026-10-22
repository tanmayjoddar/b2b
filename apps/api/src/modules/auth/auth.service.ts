import { Injectable, Logger, Optional, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import {
  AuthResponse,
  AuthUser,
  LoginPasswordDto,
  RegisterBrandDto,
  RequestOtpDto,
  VerifyOtpDto,
  AUTH_ACCESS_TOKEN_TTL_SECONDS,
  AUTH_REFRESH_TOKEN_TTL_SECONDS,
  OTP_EXPIRY_SECONDS,
  OTP_MAX_ATTEMPTS,
  Role,
} from '@factorymatch/shared';
import { AuthRepository } from './auth.repository.js';
import { ConflictError, UnauthorizedError, ValidationError } from '../../common/errors/app-error.js';

interface StoredOtp {
  code: string;
  expiresAt: number;
  attempts: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly otpStore = new Map<string, StoredOtp>();

  constructor(
    private readonly repo: AuthRepository,
    @Optional() @Inject(ConfigService) private readonly config?: ConfigService,
  ) {}

  async registerBrand(dto: RegisterBrandDto): Promise<{ auth: AuthResponse; refreshToken: string }> {
    const existing = await this.repo.findUserByEmail(dto.email);
    if (existing) {
      throw new ConflictError('An account with this email already exists');
    }

    // Argon2id password hashing
    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
      memoryCost: 19456, // 19 MiB
      timeCost: 2,
    });

    const user = await this.repo.createBrandUser({
      email: dto.email,
      passwordHash,
      companyName: dto.companyName,
      gstNo: dto.gstNo || undefined,
      website: dto.website || undefined,
    });

    const authUser = this.toAuthUser(user);
    const tokens = await this.issueTokenPair(authUser);

    return {
      auth: {
        user: authUser,
        accessToken: tokens.accessToken,
      },
      refreshToken: tokens.refreshToken,
    };
  }

  async loginWithPassword(dto: LoginPasswordDto): Promise<{ auth: AuthResponse; refreshToken: string }> {
    const user = await this.repo.findUserByEmail(dto.email);
    // Generic error to prevent account enumeration
    if (!user || !user.passwordHash) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const isValid = await argon2.verify(user.passwordHash, dto.password);
    if (!isValid) {
      throw new UnauthorizedError('Invalid credentials');
    }

    await this.repo.updateLastLogin(user.id);
    const authUser = this.toAuthUser(user);
    const tokens = await this.issueTokenPair(authUser);

    return {
      auth: {
        user: authUser,
        accessToken: tokens.accessToken,
      },
      refreshToken: tokens.refreshToken,
    };
  }

  async requestOtp(dto: RequestOtpDto): Promise<{ message: string; debugOtp?: string }> {
    // Generate secure 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = Date.now() + OTP_EXPIRY_SECONDS * 1000;

    this.otpStore.set(dto.phone, {
      code: otp,
      expiresAt,
      attempts: 0,
    });

    this.logger.log(`OTP generated for phone ${dto.phone.substring(0, 5)}*****`);

    // In production this enqueues WhatsApp/SMS delivery.
    // In development/test mode, we provide it in response for deterministic testing.
    const isDev = (this.config?.get<string>('NODE_ENV') || process.env.NODE_ENV) !== 'production';
    return {
      message: 'OTP sent successfully',
      debugOtp: isDev ? otp : undefined,
    };
  }

  async verifyOtp(dto: VerifyOtpDto): Promise<{ auth: AuthResponse; refreshToken: string }> {
    const stored = this.otpStore.get(dto.phone);
    if (!stored) {
      throw new UnauthorizedError('OTP expired or not requested');
    }

    if (Date.now() > stored.expiresAt) {
      this.otpStore.delete(dto.phone);
      throw new UnauthorizedError('OTP has expired');
    }

    if (stored.attempts >= OTP_MAX_ATTEMPTS) {
      this.otpStore.delete(dto.phone);
      throw new UnauthorizedError('Maximum OTP verification attempts exceeded');
    }

    stored.attempts += 1;

    // Constant-time comparison
    const isMatch =
      stored.code.length === dto.otp.length &&
      crypto.timingSafeEqual(Buffer.from(stored.code), Buffer.from(dto.otp));

    if (!isMatch) {
      throw new UnauthorizedError('Invalid OTP');
    }

    // Clear OTP after successful verification
    this.otpStore.delete(dto.phone);

    const user = await this.repo.createOrGetFactoryUser(dto.phone);
    await this.repo.updateLastLogin(user.id);

    const authUser = this.toAuthUser(user);
    const tokens = await this.issueTokenPair(authUser);

    return {
      auth: {
        user: authUser,
        accessToken: tokens.accessToken,
      },
      refreshToken: tokens.refreshToken,
    };
  }

  async rotateRefreshToken(refreshToken: string): Promise<{ auth: AuthResponse; refreshToken: string }> {
    const tokenHash = this.hashToken(refreshToken);
    const existing = await this.repo.findRefreshToken(tokenHash);

    if (!existing) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    // Reuse detection: if already revoked, someone is attempting a replay attack!
    if (existing.revokedAt) {
      this.logger.warn(`Refresh token reuse detected for user ${existing.userId}! Revoking all sessions.`);
      await this.repo.revokeAllUserTokens(existing.userId);
      throw new UnauthorizedError('Compromised token detected. Please login again.');
    }

    if (new Date() > existing.expiresAt) {
      await this.repo.revokeRefreshToken(existing.id);
      throw new UnauthorizedError('Refresh token expired');
    }

    // Revoke the used token
    await this.repo.revokeRefreshToken(existing.id);

    const authUser = this.toAuthUser(existing.user);
    const tokens = await this.issueTokenPair(authUser);

    return {
      auth: {
        user: authUser,
        accessToken: tokens.accessToken,
      },
      refreshToken: tokens.refreshToken,
    };
  }

  async logout(refreshToken: string): Promise<void> {
    if (!refreshToken) return;
    const tokenHash = this.hashToken(refreshToken);
    const existing = await this.repo.findRefreshToken(tokenHash);
    if (existing) {
      await this.repo.revokeRefreshToken(existing.id);
    }
  }

  private async issueTokenPair(user: AuthUser): Promise<{ accessToken: string; refreshToken: string }> {
    const accessSecret = this.config?.get<string>('JWT_ACCESS_SECRET') || process.env.JWT_ACCESS_SECRET || 'dev-secret';
    const accessToken = jwt.sign({ ...user }, accessSecret, {
      expiresIn: AUTH_ACCESS_TOKEN_TTL_SECONDS,
    });

    const rawRefreshToken = crypto.randomBytes(40).toString('hex');
    const tokenHash = this.hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + AUTH_REFRESH_TOKEN_TTL_SECONDS * 1000);

    await this.repo.saveRefreshToken(user.id, tokenHash, expiresAt);

    return {
      accessToken,
      refreshToken: rawRefreshToken,
    };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  public toAuthUser(user: any): AuthUser {
    return {
      id: user.id,
      email: user.email || null,
      phone: user.phone || null,
      role: user.role,
      status: user.status,
      brandId: user.brand?.id || null,
      factoryId: user.factories?.[0]?.id || null,
    };
  }
}
