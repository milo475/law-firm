import { UnauthorizedException, type INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AllExceptionsFilter } from '../common/filters/http-exception.filter';
import { createConfigMock } from '../common/testing/mocks';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController (HTTP)', () => {
  let app: INestApplication;
  const authService = {
    login: jest.fn(),
    register: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
    me: jest.fn(),
  };

  const authResult = {
    user: { id: 'user-1', email: 'client1@example.mn', role: 'CLIENT' },
    accessToken: 'access.jwt.token',
    refreshToken: 'raw-refresh-token',
    refreshExpiresAt: new Date(Date.now() + 7 * 86_400_000),
  };

  const cookieHeader = (res: request.Response): string[] => {
    const raw = res.headers['set-cookie'];
    return Array.isArray(raw) ? raw : raw ? [raw] : [];
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: ConfigService, useValue: createConfigMock() },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('POST /auth/login sets httpOnly access + refresh cookies and returns the user', async () => {
    authService.login.mockResolvedValue(authResult);

    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ identifier: 'client1@example.mn', password: 'Client123!' })
      .expect(200);

    expect(res.body.user.email).toBe('client1@example.mn');
    expect(res.body.accessToken).toBe('access.jwt.token');
    expect(res.body.user.passwordHash).toBeUndefined();

    const cookies = cookieHeader(res);
    const access = cookies.find((c) => c.startsWith('access_token='));
    const refresh = cookies.find((c) => c.startsWith('refresh_token='));
    expect(access).toMatch(/HttpOnly/i);
    expect(access).toMatch(/Path=\//);
    expect(refresh).toMatch(/HttpOnly/i);
    expect(refresh).toMatch(/Path=\/auth/);
    expect(refresh).toMatch(/SameSite=Lax/i);
  });

  it('POST /auth/refresh reads the refresh cookie and rotates it', async () => {
    authService.refresh.mockResolvedValue({ ...authResult, refreshToken: 'rotated-token' });

    const res = await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', ['refresh_token=raw-refresh-token'])
      .expect(200);

    expect(authService.refresh).toHaveBeenCalledWith('raw-refresh-token');
    const refresh = cookieHeader(res).find((c) => c.startsWith('refresh_token='));
    expect(refresh).toContain('refresh_token=rotated-token');
  });

  it('POST /auth/refresh without a cookie → 401 with a Mongolian message and cleared cookies', async () => {
    authService.refresh.mockRejectedValue(new UnauthorizedException('Сесс олдсонгүй. Дахин нэвтэрнэ үү'));

    const res = await request(app.getHttpServer()).post('/auth/refresh').expect(401);

    expect(res.body).toMatchObject({
      statusCode: 401,
      message: 'Сесс олдсонгүй. Дахин нэвтэрнэ үү',
      error: 'Unauthorized',
      path: '/auth/refresh',
    });
    expect(res.body.timestamp).toEqual(expect.any(String));
    const cleared = cookieHeader(res).filter((c) => /Expires=Thu, 01 Jan 1970/.test(c));
    expect(cleared.some((c) => c.startsWith('access_token='))).toBe(true);
    expect(cleared.some((c) => c.startsWith('refresh_token='))).toBe(true);
  });

  it('POST /auth/logout revokes the token and clears cookies (204)', async () => {
    authService.logout.mockResolvedValue(undefined);

    const res = await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Cookie', ['refresh_token=raw-refresh-token'])
      .expect(204);

    expect(authService.logout).toHaveBeenCalledWith('raw-refresh-token');
    expect(cookieHeader(res).some((c) => c.startsWith('access_token=;'))).toBe(true);
  });
});
