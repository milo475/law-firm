import { ConflictException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import argon2 from 'argon2';
import { createConfigMock, createPrismaMock, TEST_ENV, type PrismaMock } from '../common/testing/mocks';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaMock;
  let jwt: JwtService;
  let passwordHash: string;

  const baseUser = () => ({
    id: 'user-1',
    email: 'client1@example.mn',
    phone: '88110001',
    passwordHash,
    firstName: 'Ганбат',
    lastName: 'Сүх',
    role: 'CLIENT' as const,
    avatarUrl: null,
    isActive: true,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeAll(async () => {
    passwordHash = await argon2.hash('Client123!', { type: argon2.argon2id });
  });

  beforeEach(() => {
    prisma = createPrismaMock();
    jwt = new JwtService({ secret: TEST_ENV.JWT_ACCESS_SECRET, signOptions: { expiresIn: '15m' } });
    service = new AuthService(prisma as unknown as PrismaService, jwt, createConfigMock());
    prisma.refreshToken.create.mockImplementation(async ({ data }: any) => ({ id: 'rt-1', revokedAt: null, ...data }));
    prisma.user.update.mockResolvedValue(baseUser());
  });

  describe('login', () => {
    it('signs in with e-mail and returns a safe user + tokens', async () => {
      prisma.user.findUnique.mockResolvedValue(baseUser());

      const result = await service.login({ identifier: 'Client1@Example.mn', password: 'Client123!' });

      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: 'client1@example.mn' } });
      expect((result.user as any).passwordHash).toBeUndefined();
      expect(result.user.email).toBe('client1@example.mn');
      expect(jwt.verify(result.accessToken)).toMatchObject({ sub: 'user-1', role: 'CLIENT' });
      expect(result.refreshToken).toHaveLength(64);
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'user-1' }, data: { lastLoginAt: expect.any(Date) } }),
      );
    });

    it('signs in with a phone number (strips the +976 prefix)', async () => {
      prisma.user.findUnique.mockResolvedValue(baseUser());

      await service.login({ identifier: '+97688110001', password: 'Client123!' });

      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { phone: '88110001' } });
    });

    it('stores only a hash of the refresh token', async () => {
      prisma.user.findUnique.mockResolvedValue(baseUser());

      const result = await service.login({ identifier: 'client1@example.mn', password: 'Client123!' });
      const stored = prisma.refreshToken.create.mock.calls[0][0].data;

      expect(stored.tokenHash).not.toBe(result.refreshToken);
      expect(stored.tokenHash).toMatch(/^[a-f0-9]{64}$/);
      expect(stored.expiresAt.getTime()).toBeGreaterThan(Date.now() + 6 * 86_400_000);
    });

    it('rejects a wrong password with 401', async () => {
      prisma.user.findUnique.mockResolvedValue(baseUser());
      await expect(service.login({ identifier: 'client1@example.mn', password: 'nope' })).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('rejects an unknown user with the same 401 (no user enumeration)', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.login({ identifier: 'ghost@example.mn', password: 'Client123!' })).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('rejects a deactivated user with 403', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...baseUser(), isActive: false });
      await expect(service.login({ identifier: 'client1@example.mn', password: 'Client123!' })).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });

  describe('register', () => {
    it('creates a CLIENT with an argon2 hash and signs them in', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockImplementation(async ({ data }: any) => ({ ...baseUser(), ...data, id: 'new-id' }));

      const result = await service.register({
        email: 'new@example.mn',
        phone: '88110009',
        password: 'Secret123',
        firstName: 'Шинэ',
        lastName: 'Хэрэглэгч',
      });

      const created = prisma.user.create.mock.calls[0][0].data;
      expect(created.role).toBe('CLIENT');
      expect(created.passwordHash).not.toBe('Secret123');
      await expect(argon2.verify(created.passwordHash, 'Secret123')).resolves.toBe(true);
      expect(result.user.id).toBe('new-id');
      expect(jwt.verify(result.accessToken)).toMatchObject({ sub: 'new-id' });
    });

    it('rejects a duplicate e-mail with 409', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({ id: 'existing' });
      await expect(
        service.register({ email: 'client1@example.mn', password: 'Secret123', firstName: 'Аа', lastName: 'Бб' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('refresh (rotation)', () => {
    const storedToken = (overrides: Record<string, unknown> = {}) => ({
      id: 'rt-old',
      userId: 'user-1',
      tokenHash: 'irrelevant',
      expiresAt: new Date(Date.now() + 86_400_000),
      revokedAt: null,
      createdAt: new Date(),
      user: baseUser(),
      ...overrides,
    });

    it('revokes the presented token and issues a new pair', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(storedToken());
      prisma.refreshToken.update.mockResolvedValue({});

      const result = await service.refresh('raw-refresh-token');

      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'rt-old' },
        data: { revokedAt: expect.any(Date) },
      });
      expect(prisma.refreshToken.create).toHaveBeenCalledTimes(1);
      expect(result.refreshToken).not.toBe('raw-refresh-token');
      expect(jwt.verify(result.accessToken)).toMatchObject({ sub: 'user-1' });
    });

    it('looks the token up by its keyed hash, never the raw value', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(storedToken());
      prisma.refreshToken.update.mockResolvedValue({});

      await service.refresh('raw-refresh-token');

      const lookup = prisma.refreshToken.findUnique.mock.calls[0][0].where.tokenHash;
      expect(lookup).toMatch(/^[a-f0-9]{64}$/);
      expect(lookup).not.toBe('raw-refresh-token');
    });

    it('treats reuse of a revoked token as theft and revokes every session', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(storedToken({ revokedAt: new Date() }));
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 3 });

      await expect(service.refresh('reused')).rejects.toBeInstanceOf(UnauthorizedException);
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
      expect(prisma.refreshToken.create).not.toHaveBeenCalled();
    });

    it('rejects an expired token', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(storedToken({ expiresAt: new Date(Date.now() - 1000) }));
      await expect(service.refresh('expired')).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects an unknown or missing token', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(null);
      await expect(service.refresh('unknown')).rejects.toBeInstanceOf(UnauthorizedException);
      await expect(service.refresh(undefined)).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('revokes the presented refresh token', async () => {
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      await service.logout('raw-refresh-token');

      const call = prisma.refreshToken.updateMany.mock.calls[0][0];
      expect(call.where.tokenHash).toMatch(/^[a-f0-9]{64}$/);
      expect(call.where.revokedAt).toBeNull();
      expect(call.data.revokedAt).toBeInstanceOf(Date);
    });

    it('is a no-op without a token', async () => {
      await service.logout(undefined);
      expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
    });
  });
});
