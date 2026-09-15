import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { ADMIN_USER, LAWYER_USER, OTHER_LAWYER, createPrismaMock, type PrismaMock } from '../common/testing/mocks';
import { PrismaService } from '../prisma/prisma.service';
import { LawyersService } from './lawyers.service';

describe('LawyersService (profile management)', () => {
  let service: LawyersService;
  let prisma: PrismaMock;
  const profile = { title: 'Хуульч', bio: 'Хөдөлмөрийн эрх зүйн чиглэлээр ажилладаг.', specializations: [], education: 'МУИС', yearsOfExperience: 5, isPublic: true, sortOrder: 0 };

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new LawyersService(prisma as unknown as PrismaService);
    prisma.lawyerProfile.create.mockImplementation(async ({ data }: any) => ({ id: 'p-1', ...data }));
    prisma.lawyerProfile.update.mockImplementation(async ({ data }: any) => ({ id: 'p-1', ...data }));
  });

  it('a LAWYER cannot manage another lawyer\'s profile → 403', async () => {
    await expect(service.updateProfile(OTHER_LAWYER.id, { title: 'Өөр' }, LAWYER_USER)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.lawyerProfile.update).not.toHaveBeenCalled();
  });

  it('a profile can only be created for a LAWYER user → 400 for a client', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'client-id', role: 'CLIENT' });
    await expect(service.createProfile('client-id', profile, ADMIN_USER)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('a second profile for the same lawyer → 409', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: LAWYER_USER.id, role: 'LAWYER' });
    prisma.lawyerProfile.findUnique.mockResolvedValue({ id: 'p-1' });
    await expect(service.createProfile(LAWYER_USER.id, profile, LAWYER_USER)).rejects.toBeInstanceOf(ConflictException);
  });

  it('a LAWYER updates only the fields they send on their own profile', async () => {
    prisma.lawyerProfile.findUnique.mockResolvedValue({ id: 'p-1' });
    await service.updateProfile(LAWYER_USER.id, { isPublic: false }, LAWYER_USER);
    expect(prisma.lawyerProfile.update).toHaveBeenCalledWith({ where: { userId: LAWYER_USER.id }, data: { isPublic: false } });
  });
});
