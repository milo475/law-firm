import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { CurrentUser, Public } from '../common/decorators';
import type { RequestUser } from '../common/types/request-user';
import type { Env } from '../config/env';
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  SESSION_HINT_COOKIE,
  accessCookieOptions,
  refreshCookieOptions,
  sessionHintCookieOptions,
} from './auth.constants';
import { AuthService, type AuthResult } from './auth.service';
import { ForgotPasswordDto, LoginDto, RegisterDto, ResetPasswordDto } from './dto/auth.dto';

type RequestWithCookies = Request & { cookies?: Record<string, string> };

/**
 * Credential endpoints need a far smaller budget than ordinary API calls: with the global limit a
 * single IP could try 120 passwords a minute. The shares are derived from THROTTLE_LIMIT so raising
 * that one knob for an e2e or load run lifts these too (default 120 → login 10, register 5, refresh 30).
 * Decorators are evaluated at import time, so this reads process.env rather than ConfigService.
 */
const GLOBAL_LIMIT = Number(process.env.THROTTLE_LIMIT ?? 120) || 120;
const LOGIN_SHARE = 1 / 12;
const REGISTER_SHARE = 1 / 24;
const REFRESH_SHARE = 1 / 4;
const authThrottle = (share: number) => ({ default: { ttl: 60_000, limit: Math.max(1, Math.ceil(GLOBAL_LIMIT * share)) } });

/**
 * Asking for a reset link sends an e-mail to somebody else's address, so it gets its own, much
 * tighter window: three in a quarter of an hour at the default limit (raised with THROTTLE_LIMIT).
 */
const FORGOT_WINDOW_MS = 15 * 60_000;
const forgotThrottle = { default: { ttl: FORGOT_WINDOW_MS, limit: Math.max(3, Math.ceil(GLOBAL_LIMIT / 40)) } };

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Public()
  @Throttle(authThrottle(LOGIN_SHARE))
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'И-мэйл эсвэл утас + нууц үгээр нэвтрэх' })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.login(dto);
    return this.respond(res, result);
  }

  @Public()
  @Throttle(authThrottle(REGISTER_SHARE))
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Харилцагчаар бүртгүүлэх (зөвхөн CLIENT)' })
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.register(dto);
    return this.respond(res, result);
  }

  @Public()
  @Throttle(authThrottle(REFRESH_SHARE))
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth(REFRESH_COOKIE)
  @ApiOperation({ summary: 'Refresh cookie ашиглан шинэ токен авах (rotation)' })
  async refresh(@Req() req: RequestWithCookies, @Res({ passthrough: true }) res: Response) {
    try {
      const result = await this.auth.refresh(req.cookies?.[REFRESH_COOKIE]);
      return this.respond(res, result);
    } catch (error) {
      this.clearCookies(res);
      throw error;
    }
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Гарах — refresh токеныг хүчингүй болгож cookie-г устгана' })
  async logout(@Req() req: RequestWithCookies, @Res({ passthrough: true }) res: Response): Promise<void> {
    await this.auth.logout(req.cookies?.[REFRESH_COOKIE]);
    this.clearCookies(res);
  }

  @Public()
  @Throttle(forgotThrottle)
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Нууц үг сэргээх холбоос илгээх (хаяг бүртгэлтэй эсэхээс үл хамааран ижил хариу)' })
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<{ ok: true }> {
    await this.auth.requestPasswordReset(dto);
    // Deliberately the same answer either way: a different one would say who banks with this firm.
    return { ok: true };
  }

  @Public()
  @Throttle(authThrottle(REGISTER_SHARE))
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Сэргээх холбоосоор шинэ нууц үг тохируулах (бүх сесс хаагдана)' })
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<{ ok: true }> {
    await this.auth.resetPassword(dto);
    return { ok: true };
  }

  @Public()
  @Throttle(authThrottle(REGISTER_SHARE))
  @Post('accept-invite')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Урилгын холбоосоор нууц үгээ тохируулж бүртгэлээ дуусгах' })
  async acceptInvite(@Body() dto: ResetPasswordDto): Promise<{ ok: true }> {
    await this.auth.acceptInvite(dto);
    return { ok: true };
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Нэвтэрсэн хэрэглэгчийн мэдээлэл' })
  me(@CurrentUser() user: RequestUser) {
    return this.auth.me(user.id);
  }

  // ─── helpers ───────────────────────────────────────────────────────────────

  private respond(res: Response, result: AuthResult) {
    res.cookie(ACCESS_COOKIE, result.accessToken, accessCookieOptions(this.config));
    res.cookie(REFRESH_COOKIE, result.refreshToken, refreshCookieOptions(this.config, result.refreshExpiresAt));
    res.cookie(SESSION_HINT_COOKIE, '1', sessionHintCookieOptions(this.config, result.refreshExpiresAt));
    return {
      user: result.user,
      accessToken: result.accessToken,
      expiresIn: this.config.get('JWT_ACCESS_TTL', { infer: true }),
    };
  }

  private clearCookies(res: Response) {
    const { maxAge: _a, ...access } = accessCookieOptions(this.config);
    const { maxAge: _r, ...refresh } = refreshCookieOptions(this.config);
    const { maxAge: _s, ...hint } = sessionHintCookieOptions(this.config);
    res.clearCookie(ACCESS_COOKIE, access);
    res.clearCookie(REFRESH_COOKIE, refresh);
    res.clearCookie(SESSION_HINT_COOKIE, hint);
  }
}
