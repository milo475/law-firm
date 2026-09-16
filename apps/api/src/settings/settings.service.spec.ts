import { InternalServerErrorException } from '@nestjs/common';
import { EXAMPLE_FIRM_SETTINGS } from '@law-firm/shared';
import { ADMIN_USER, createPrismaMock, type PrismaMock } from '../common/testing/mocks';
import type { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from './settings.service';

const SAVED = { bankName: 'Голомт банк', accountNumber: '1105123456', accountName: 'Law Firm ХХН' };
const FIRM = {
  name: '«Law Firm» ХХК',
  registrationNumber: '5190028',
  phone: '70001199',
  email: 'info@lawfirm.mn',
  address: 'Улаанбаатар, Сүхбаатар дүүрэг, Их тойруу 14',
  workingHours: 'Даваа–Баасан 09:00–18:00',
};

describe('SettingsService', () => {
  let prisma: PrismaMock;
  let service: SettingsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new SettingsService(prisma as unknown as PrismaService);
  });

  describe('bank account', () => {
    it('no saved row → the built-in example account with updatedAt null', async () => {
      prisma.setting.findUnique.mockResolvedValue(null);
      await expect(service.getBankAccount()).resolves.toEqual({
        bankName: 'Хаан банк',
        accountNumber: '5023118822',
        accountName: '«Law Firm» ХХН',
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

  describe('firm details', () => {
    it('no saved row → the example details, with no registration number and updatedAt null', async () => {
      prisma.setting.findUnique.mockResolvedValue(null);
      const firm = await service.getFirm();
      expect(firm).toEqual(EXAMPLE_FIRM_SETTINGS);
      expect(firm).toMatchObject({ registrationNumber: null, updatedAt: null, phone: '70001199' });
      expect(prisma.setting.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { key: 'firm' } }));
    });

    it('saved row → the saved details and when they were saved', async () => {
      const updatedAt = new Date('2026-09-15T10:30:00Z');
      prisma.setting.findUnique.mockResolvedValue({ value: FIRM, updatedAt });
      await expect(service.getFirm()).resolves.toEqual({ ...FIRM, updatedAt });
    });

    it('a corrupted stored value is a 500 that names the firm settings', async () => {
      prisma.setting.findUnique.mockResolvedValue({ value: { ...FIRM, registrationNumber: 'abc' }, updatedAt: new Date() });
      await expect(service.getFirm()).rejects.toThrow('Фирмийн мэдээллийн тохиргоо буруу хадгалагдсан');
    });

    it('update upserts the details under the firm key with the ADMIN as updater', async () => {
      const updatedAt = new Date('2026-09-15T11:30:00Z');
      prisma.setting.upsert.mockResolvedValue({ updatedAt });
      await expect(service.updateFirm(FIRM, ADMIN_USER)).resolves.toEqual({ ...FIRM, updatedAt });
      expect(prisma.setting.upsert).toHaveBeenCalledWith({
        where: { key: 'firm' },
        create: { key: 'firm', value: FIRM, updatedById: ADMIN_USER.id },
        update: { value: FIRM, updatedById: ADMIN_USER.id },
        select: { updatedAt: true },
      });
    });
  });
});
