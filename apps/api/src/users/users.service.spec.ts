import { ConflictException, ForbiddenException } from '@nestjs/common';
import { PasswordSchema } from '@law-firm/shared';
import { AuthService } from '../auth/auth.service';
import { ADMIN_USER, LAWYER_USER, createPrismaMock, type PrismaMock } from '../common/testing/mocks';
import { PrismaService } from '../prisma/prisma.service';
import { generateTemporaryPassword } from './temporary-password';
import { UsersService } from './users.service';

describe('UsersService (admin panel)', () => {
  let service: UsersService;
  let prisma: PrismaMock;
  let auth: { hashPassword: jest.Mock; revokeAllForUser: jest.Mock; verifyPassword: jest.Mock };

  const input = { email: 'new.client@example.mn', firstName: 'Болд', lastName: 'Бат', role: 'CLIENT' as const, isActive: true };

  beforeEach(() => {
    prisma = createPrismaMock();
    auth = { hashPassword: jest.fn(async (p: string) => `hashed:${p}`), revokeAllForUser: jest.fn(), verifyPassword: jest.fn() };
    service = new UsersService(prisma as unknown as PrismaService, auth as unknown as AuthService);
    prisma.user.findMany.mockResolvedValue([]);
    prisma.user.count.mockResolvedValue(0);
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.user.create.mockImplementation(async ({ data }: any) => ({ id: 'u-new', ...data }));
  });

  it('a LAWYER listing users only ever gets clients, whatever role they ask for', async () => {
    await service.findAll({ page: 1, limit: 20, role: 'LAWYER' }, LAWYER_USER);
    expect(prisma.user.findMany.mock.calls[0][0].where.role).toBe('CLIENT');
  });

  it('ADMIN listing keeps the requested role filter and search', async () => {
    await service.findAll({ page: 1, limit: 20, role: 'LAWYER', search: 'bat' }, ADMIN_USER);
    const where = prisma.user.findMany.mock.calls[0][0].where;
    expect(where.role).toBe('LAWYER');
    expect(where.OR).toHaveLength(4);
  });

  it('a LAWYER cannot open another staff member\'s record → 403', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u-2', role: 'LAWYER' });
    await expect(service.findOne('u-2', LAWYER_USER)).rejects.toBeInstanceOf(ForbiddenException);
    prisma.user.findUnique.mockResolvedValue({ id: 'u-3', role: 'CLIENT' });
    await expect(service.findOne('u-3', LAWYER_USER)).resolves.toMatchObject({ id: 'u-3' });
  });

  it('without a password a valid temporary password is generated, hashed and returned once', async () => {
    const result = await service.create(input);
    expect(result.temporaryPassword).not.toBeNull();
    expect(PasswordSchema.safeParse(result.temporaryPassword).success).toBe(true);
    expect(auth.hashPassword).toHaveBeenCalledWith(result.temporaryPassword);
    expect(prisma.user.create.mock.calls[0][0].data.passwordHash).toBe(`hashed:${result.temporaryPassword}`);
  });

  it('with a password no temporary password is returned', async () => {
    const result = await service.create({ ...input, password: 'Secret123' });
    expect(result.temporaryPassword).toBeNull();
    expect(auth.hashPassword).toHaveBeenCalledWith('Secret123');
  });

  it('a duplicate e-mail → 409', async () => {
    prisma.user.findFirst.mockResolvedValue({ email: input.email, phone: null });
    await expect(service.create(input)).rejects.toBeInstanceOf(ConflictException);
  });

  it('generated passwords always contain a letter and a digit', () => {
    for (let i = 0; i < 200; i += 1) {
      const password = generateTemporaryPassword();
      expect(password).toHaveLength(12);
      expect(password).toMatch(/[A-Za-z]/);
      expect(password).toMatch(/[0-9]/);
    }
  });
});
