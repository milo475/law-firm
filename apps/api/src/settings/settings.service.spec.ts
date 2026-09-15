import { InternalServerErrorException } from '@nestjs/common';
import { ADMIN_USER, createPrismaMock, type PrismaMock } from '../common/testing/mocks';
import type { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from './settings.service';

const SAVED = { bankName: 'Голомт банк', accountNumber: '1105123456', accountName: 'Тулгуур ХХН' };

describe('SettingsService (bank account)', () => {
  let prisma: PrismaMock;
  let service: SettingsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new SettingsService(prisma as unknown as PrismaService);
  });

  it('no saved row → the built-in example account with updatedAt null', async () => {
    prisma.setting.findUnique.mockResolvedValue(null);
    await expect(service.getBankAccount()).resolves.toEqual({
      bankName: 'Хаан банк',
      accountNumber: '5023118822',
      accountName: 'Тулгуур Хуулийн Фирм ХХН',
      updatedAt: null,
    });
    expect(prisma.setting.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { key: 'bank-account' } }));
  });

  it('saved row → the saved account and when it was saved', async () => {
    const updatedAt = new Date('2026-09-15T10:00:00Z');
    prisma.setting.findUnique.mockResolvedValue({ value: SAVED, updatedAt });
    await expect(service.getBankAccount()).resolves.toEqual({ ...SAVED, updatedAt });
  });

  it('a corrupted stored value is a 500, never the example account', async () => {
    prisma.setting.findUnique.mockResolvedValue({ value: { bankName: 'Голомт банк' }, updatedAt: new Date() });
    await expect(service.getBankAccount()).rejects.toBeInstanceOf(InternalServerErrorException);
  });

  it('update upserts the account under one key with the ADMIN as updater', async () => {
    const updatedAt = new Date('2026-09-15T11:00:00Z');
    prisma.setting.upsert.mockResolvedValue({ updatedAt });
    await expect(service.updateBankAccount(SAVED, ADMIN_USER)).resolves.toEqual({ ...SAVED, updatedAt });
    expect(prisma.setting.upsert).toHaveBeenCalledWith({
      where: { key: 'bank-account' },
      create: { key: 'bank-account', value: SAVED, updatedById: ADMIN_USER.id },
      update: { value: SAVED, updatedById: ADMIN_USER.id },
      select: { updatedAt: true },
    });
  });
});
