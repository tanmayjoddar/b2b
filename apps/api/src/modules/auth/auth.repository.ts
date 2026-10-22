import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { Role, UserStatus } from '@factorymatch/shared';

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findUserByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        brand: true,
        factories: true,
      },
    });
  }

  async findUserByPhone(phone: string) {
    return this.prisma.user.findUnique({
      where: { phone },
      include: {
        brand: true,
        factories: true,
      },
    });
  }

  async findUserById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        brand: true,
        factories: true,
      },
    });
  }

  async createBrandUser(data: {
    email: string;
    passwordHash: string;
    companyName: string;
    gstNo?: string;
    website?: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email,
          passwordHash: data.passwordHash,
          role: Role.BRAND,
          status: UserStatus.ACTIVE,
        },
      });

      const brand = await tx.brand.create({
        data: {
          userId: user.id,
          companyName: data.companyName,
          gstNo: data.gstNo || null,
          website: data.website || null,
        },
      });

      return {
        ...user,
        brand,
        factories: [],
      };
    });
  }

  async createOrGetFactoryUser(phone: string) {
    const existing = await this.findUserByPhone(phone);
    if (existing) {
      return existing;
    }

    return this.prisma.user.create({
      data: {
        phone,
        role: Role.FACTORY,
        status: UserStatus.ACTIVE,
      },
      include: {
        brand: true,
        factories: true,
      },
    });
  }

  async saveRefreshToken(userId: string, tokenHash: string, expiresAt: Date) {
    return this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });
  }

  async findRefreshToken(tokenHash: string) {
    return this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: { include: { brand: true, factories: true } } },
    });
  }

  async revokeRefreshToken(id: string) {
    return this.prisma.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllUserTokens(userId: string) {
    return this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async updateLastLogin(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }
}
