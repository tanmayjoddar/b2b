import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import {
  RegisterBrandSchema,
  RegisterBrandDto,
  LoginPasswordSchema,
  LoginPasswordDto,
  RequestOtpSchema,
  RequestOtpDto,
  VerifyOtpSchema,
  VerifyOtpDto,
  AuthUser,
  AUTH_REFRESH_TOKEN_TTL_SECONDS,
  AUTH_ACCESS_TOKEN_TTL_SECONDS,
} from '@factorymatch/shared';
import { AuthService } from './auth.service.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register/brand')
  async registerBrand(
    @Body(new ZodValidationPipe(RegisterBrandSchema)) dto: RegisterBrandDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { auth, refreshToken } = await this.authService.registerBrand(dto);
    this.setAuthCookies(res, auth.accessToken, refreshToken);
    return { data: auth };
  }

  @Post('login/password')
  @HttpCode(HttpStatus.OK)
  async loginPassword(
    @Body(new ZodValidationPipe(LoginPasswordSchema)) dto: LoginPasswordDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { auth, refreshToken } = await this.authService.loginWithPassword(dto);
    this.setAuthCookies(res, auth.accessToken, refreshToken);
    return { data: auth };
  }

  @Post('otp/request')
  @HttpCode(HttpStatus.OK)
  async requestOtp(@Body(new ZodValidationPipe(RequestOtpSchema)) dto: RequestOtpDto) {
    const result = await this.authService.requestOtp(dto);
    return { data: result };
  }

  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(
    @Body(new ZodValidationPipe(VerifyOtpSchema)) dto: VerifyOtpDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { auth, refreshToken } = await this.authService.verifyOtp(dto);
    this.setAuthCookies(res, auth.accessToken, refreshToken);
    return { data: auth };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.refresh_token || (req.body && req.body.refreshToken);
    const { auth, refreshToken: newRefreshToken } = await this.authService.rotateRefreshToken(refreshToken);
    this.setAuthCookies(res, auth.accessToken, newRefreshToken);
    return { data: auth };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.refresh_token || (req.body && req.body.refreshToken);
    await this.authService.logout(refreshToken);
    this.clearAuthCookies(res);
    return { data: { success: true } };
  }

  @Get('me')
  @UseGuards(AuthGuard)
  async getMe(@CurrentUser() user: AuthUser) {
    return { data: user };
  }

  private setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
    const isProd = process.env.NODE_ENV === 'production';

    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: AUTH_ACCESS_TOKEN_TTL_SECONDS * 1000,
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: AUTH_REFRESH_TOKEN_TTL_SECONDS * 1000,
      path: '/api/v1/auth',
    });
  }

  private clearAuthCookies(res: Response) {
    res.clearCookie('access_token');
    res.clearCookie('refresh_token', { path: '/api/v1/auth' });
  }
}
