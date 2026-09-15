import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { INVOICE_STATUS_TRANSITIONS, canTransitionInvoice } from '@law-firm/shared';
import { CasesService } from '../cases/cases.service';
import { ADMIN_USER, LAWYER_USER, OTHER_LAWYER, createPrismaMock, type PrismaMock } from '../common/testing/mocks';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { InvoicesService } from './invoices.service';

const YEAR = new Date().getFullYear();
const caseRef = { id: 'case-1', caseNumber: `LF-${YEAR}-0001`, clientId: 'client-id', lawyerId: LAWYER_USER.id };

describe('InvoicesService (staff)', () => {
  let service: InvoicesService;
  let prisma: PrismaMock;
  let notifications: { createMany: jest.Mock };

  const stored = (status: string) => ({
    id: 'inv-1',
    invoiceNumber: `INV-${YEAR}-0002`,
    status,
    amount: '800000.00',
    dueDate: new Date('2026-09-30T00:00:00Z'),
    case: caseRef,
  });

  beforeEach(() => {
    prisma = createPrismaMock();
    notifications = { createMany: jest.fn().mockResolvedValue({ count: 1 }) };
    service = new InvoicesService(
      prisma as unknown as PrismaService,
      new CasesService(prisma as unknown as PrismaService),
      notifications as unknown as NotificationsService,
    );
    prisma.case.findUnique.mockResolvedValue({ ...caseRef, title: 'Маргаан', status: 'IN_PROGRESS' });
    prisma.invoice.findFirst.mockResolvedValue({ invoiceNumber: `INV-${YEAR}-0004` });
    prisma.invoice.create.mockImplementation(async ({ data }: any) => ({ id: 'inv-new', ...data }));
    prisma.invoice.update.mockImplementation(async ({ data }: any) => ({ ...stored('DRAFT'), ...data }));
  });

  describe('create', () => {
    const input = { caseId: 'case-1', amount: 1500000, description: 'Шүүхийн төлөөлөл', dueDate: new Date('2026-10-01T00:00:00Z') };

    it('assigned lawyer creates a DRAFT with the next invoice number and a 2-decimal amount', async () => {
      const created = await service.create(input, LAWYER_USER);
      expect(prisma.invoice.create.mock.calls[0][0].data).toMatchObject({
        invoiceNumber: `INV-${YEAR}-0005`,
        status: 'DRAFT',
        amount: '1500000.00',
      });
      expect(created.amount).toBe('1500000.00');
    });

    it('a lawyer who does not handle the case → 403', async () => {
      await expect(service.create(input, OTHER_LAWYER)).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.invoice.create).not.toHaveBeenCalled();
    });
  });

  describe('status transitions', () => {
    it('PAID → DRAFT is rejected with 400', async () => {
      prisma.invoice.findUnique.mockResolvedValue(stored('PAID'));
      await expect(service.update('inv-1', { status: 'DRAFT' }, ADMIN_USER)).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.invoice.update).not.toHaveBeenCalled();
    });

    it('DRAFT → PAID (skipping SENT) is rejected with 400', async () => {
      prisma.invoice.findUnique.mockResolvedValue(stored('DRAFT'));
      await expect(service.update('inv-1', { status: 'PAID' }, LAWYER_USER)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('CANCELLED is final → 400', async () => {
      prisma.invoice.findUnique.mockResolvedValue(stored('CANCELLED'));
      await expect(service.update('inv-1', { status: 'SENT' }, ADMIN_USER)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('DRAFT → SENT notifies the client with a portal link', async () => {
      prisma.invoice.findUnique.mockResolvedValue(stored('DRAFT'));
      await service.update('inv-1', { status: 'SENT' }, LAWYER_USER);
      expect(prisma.invoice.update.mock.calls[0][0].data).toEqual({ status: 'SENT' });
      expect(notifications.createMany).toHaveBeenCalledWith([
        expect.objectContaining({ userId: 'client-id', type: 'INVOICE', link: '/portal/invoices/inv-1', body: expect.stringContaining('800 000₮') }),
      ]);
    });

    it('SENT → PAID sets paidAt and sends no notification', async () => {
      prisma.invoice.findUnique.mockResolvedValue(stored('SENT'));
      await service.update('inv-1', { status: 'PAID' }, ADMIN_USER);
      const data = prisma.invoice.update.mock.calls[0][0].data;
      expect(data.status).toBe('PAID');
      expect(data.paidAt).toBeInstanceOf(Date);
      expect(notifications.createMany).not.toHaveBeenCalled();
    });

    it('amount can only be edited while DRAFT → 400 on a SENT invoice', async () => {
      prisma.invoice.findUnique.mockResolvedValue(stored('SENT'));
      await expect(service.update('inv-1', { amount: 1 }, ADMIN_USER)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('a lawyer who does not handle the case cannot change the status → 403', async () => {
      prisma.invoice.findUnique.mockResolvedValue(stored('DRAFT'));
      await expect(service.update('inv-1', { status: 'SENT' }, OTHER_LAWYER)).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('INVOICE_STATUS_TRANSITIONS', () => {
    it.each([
      ['DRAFT', 'SENT', true],
      ['DRAFT', 'CANCELLED', true],
      ['SENT', 'PAID', true],
      ['SENT', 'OVERDUE', true],
      ['OVERDUE', 'PAID', true],
      ['PAID', 'SENT', false],
      ['PAID', 'CANCELLED', false],
      ['SENT', 'DRAFT', false],
    ] as const)('%s → %s is %s', (from, to, allowed) => {
      expect(canTransitionInvoice(from, to)).toBe(allowed);
    });

    it('PAID and CANCELLED have no outgoing transitions', () => {
      expect(INVOICE_STATUS_TRANSITIONS.PAID).toEqual([]);
      expect(INVOICE_STATUS_TRANSITIONS.CANCELLED).toEqual([]);
    });
  });
});
