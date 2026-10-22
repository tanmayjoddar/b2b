import 'reflect-metadata';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/infra/prisma/prisma.service.js';
import { Role, UserStatus } from '@factorymatch/shared';
import * as argon2 from 'argon2';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter.js';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let mockPrisma: any;

  const testBrandUser = {
    id: 'user-brand-1',
    email: 'testbrand@example.com',
    passwordHash: '',
    role: Role.BRAND,
    status: UserStatus.ACTIVE,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    brand: {
      id: 'brand-1',
      userId: 'user-brand-1',
      companyName: 'Snack Brand Co',
      gstNo: '27AAAAA0000A1Z5',
      website: 'https://snackbrand.com',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    },
    factories: [],
  };

  beforeAll(async () => {
    testBrandUser.passwordHash = await argon2.hash('StrongPass123!', {
      type: argon2.argon2id,
    });

    mockPrisma = {
      $connect: async () => {},
      $disconnect: async () => {},
      isHealthy: async () => true,
      $transaction: async (cb: any) =>
        cb({
          user: {
            create: async () => testBrandUser,
          },
          brand: {
            create: async () => testBrandUser.brand,
          },
        }),
      user: {
        findUnique: async ({ where }: any) => {
          if (where.email === testBrandUser.email) return testBrandUser;
          if (where.phone === '+919999988888') {
            return {
              id: 'user-factory-1',
              phone: '+919999988888',
              email: null,
              role: Role.FACTORY,
              status: UserStatus.ACTIVE,
              brand: null,
              factories: [{ id: 'factory-1' }],
            };
          }
          return null;
        },
        create: async ({ data }: any) => ({
          id: 'user-factory-1',
          ...data,
          brand: null,
          factories: [{ id: 'factory-1' }],
        }),
        update: async () => testBrandUser,
      },
      refreshToken: {
        create: async () => ({ id: 'rt-1' }),
        findUnique: async () => null,
        update: async () => ({ id: 'rt-1' }),
        updateMany: async () => ({ count: 1 }),
      },
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser('test-cookie-secret-min-16-chars'));
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  let brandAccessToken = '';

  it('POST /api/v1/auth/login/password successfully authenticates brand', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login/password')
      .send({
        email: testBrandUser.email,
        password: 'StrongPass123!',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(testBrandUser.email);
    expect(res.body.data.user.role).toBe(Role.BRAND);
    expect(res.body.data.accessToken).toBeDefined();

    brandAccessToken = res.body.data.accessToken;
    // Verify httpOnly cookie was set
    const cookies = res.headers['set-cookie'] as unknown;
    expect(cookies).toBeDefined();
    expect(String(cookies).includes('access_token')).toBe(true);
  });

  it('GET /api/v1/auth/me returns user profile with valid Bearer token', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${brandAccessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe(testBrandUser.email);
    expect(res.body.data.role).toBe(Role.BRAND);
    expect(res.body.data.brandId).toBe('brand-1');
  });

  it('GET /api/v1/auth/me rejects request without token with 401 Unauthorized', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('Full OTP flow: request OTP and verify OTP for factory login', async () => {
    const phone = '+919999988888';
    const otpReq = await request(app.getHttpServer())
      .post('/api/v1/auth/otp/request')
      .send({ phone });

    expect(otpReq.status).toBe(200);
    const otpCode = otpReq.body.data.debugOtp;
    expect(otpCode).toBeDefined();

    const verifyReq = await request(app.getHttpServer())
      .post('/api/v1/auth/otp/verify')
      .send({ phone, otp: otpCode });

    expect(verifyReq.status).toBe(200);
    expect(verifyReq.body.data.user.role).toBe(Role.FACTORY);
    expect(verifyReq.body.data.user.phone).toBe(phone);
    expect(verifyReq.body.data.accessToken).toBeDefined();
  });
});
