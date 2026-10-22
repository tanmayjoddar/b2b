import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService } from './auth.service.js';
import { AuthRepository } from './auth.repository.js';
import { ConfigService } from '@nestjs/config';
import { Role, UserStatus } from '@factorymatch/shared';
import { ConflictError, UnauthorizedError } from '../../common/errors/app-error.js';

describe('AuthService', () => {
  let service: AuthService;
  let mockRepo: any;
  let mockConfig: any;

  beforeEach(() => {
    mockRepo = {
      findUserByEmail: vi.fn(),
      findUserByPhone: vi.fn(),
      findUserById: vi.fn(),
      createBrandUser: vi.fn(),
      createOrGetFactoryUser: vi.fn(),
      saveRefreshToken: vi.fn(),
      findRefreshToken: vi.fn(),
      revokeRefreshToken: vi.fn(),
      revokeAllUserTokens: vi.fn(),
      updateLastLogin: vi.fn(),
    };

    mockConfig = {
      get: vi.fn((key: string) => {
        if (key === 'JWT_ACCESS_SECRET') return 'test-jwt-access-secret-32-bytes-long';
        if (key === 'NODE_ENV') return 'test';
        return undefined;
      }),
    };

    service = new AuthService(mockRepo as unknown as AuthRepository, mockConfig as unknown as ConfigService);
  });

  describe('registerBrand', () => {
    it('successfully registers brand with argon2id hash and returns auth tokens', async () => {
      mockRepo.findUserByEmail.mockResolvedValue(null);
      mockRepo.createBrandUser.mockResolvedValue({
        id: 'usr-1',
        email: 'founder@proteinbites.in',
        role: Role.BRAND,
        status: UserStatus.ACTIVE,
        brand: { id: 'brd-1', companyName: 'Protein Bites' },
        factories: [],
      });
      mockRepo.saveRefreshToken.mockResolvedValue({});

      const result = await service.registerBrand({
        email: 'founder@proteinbites.in',
        password: 'Password123!',
        companyName: 'Protein Bites',
      });

      expect(result.auth.user.email).toBe('founder@proteinbites.in');
      expect(result.auth.user.brandId).toBe('brd-1');
      expect(result.auth.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(mockRepo.createBrandUser).toHaveBeenCalled();
    });

    it('rejects duplicate email registration with ConflictError', async () => {
      mockRepo.findUserByEmail.mockResolvedValue({ id: 'existing-user' });

      await expect(
        service.registerBrand({
          email: 'founder@proteinbites.in',
          password: 'Password123!',
          companyName: 'Protein Bites',
        }),
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('loginWithPassword', () => {
    it('rejects nonexistent user with generic UnauthorizedError', async () => {
      mockRepo.findUserByEmail.mockResolvedValue(null);

      await expect(
        service.loginWithPassword({
          email: 'unknown@example.com',
          password: 'Password123!',
        }),
      ).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('requestOtp and verifyOtp', () => {
    it('generates OTP and verifies valid code successfully', async () => {
      const phone = '+919876543210';
      const otpResponse = await service.requestOtp({ phone });
      expect(otpResponse.debugOtp).toBeDefined();

      mockRepo.createOrGetFactoryUser.mockResolvedValue({
        id: 'usr-fac-1',
        phone,
        role: Role.FACTORY,
        status: UserStatus.ACTIVE,
        factories: [{ id: 'fac-1' }],
      });
      mockRepo.saveRefreshToken.mockResolvedValue({});
      mockRepo.updateLastLogin.mockResolvedValue({});

      const verifyResult = await service.verifyOtp({
        phone,
        otp: otpResponse.debugOtp!,
      });

      expect(verifyResult.auth.user.role).toBe(Role.FACTORY);
      expect(verifyResult.auth.user.factoryId).toBe('fac-1');
      expect(verifyResult.auth.accessToken).toBeDefined();
    });

    it('rejects invalid OTP with UnauthorizedError', async () => {
      const phone = '+919876543210';
      await service.requestOtp({ phone });

      await expect(
        service.verifyOtp({
          phone,
          otp: '000000',
        }),
      ).rejects.toThrow(UnauthorizedError);
    });
  });
});
