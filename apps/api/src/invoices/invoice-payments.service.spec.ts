import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import { CasesService } from '../cases/cases.service';
import {
  ADMIN_USER,
  CLIENT_USER,
  LAWYER_USER,
  OTHER_CLIENT,
  OTHER_LAWYER,
  createPrismaMock,
  type PrismaMock,
} from '../common/testing/mocks';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { INVOICE_PAYMENT_EVENTS } from './invoice-payment.events';
import { InvoicePaymentsService } from './invoice-payments.service';
import { InvoicesService } from './invoices.service';

const invoiceRow = (status: string) => ({
  id: 'inv-1',
  invoiceNumber: 'INV-2026-0002',
  amount: '800000.00',
  status,
  case: { id: 'case-1', caseNumber: 'LF-2026-0001', clientId: CLIENT_USER.id, lawyerId: LAWYER_USER.id },
});

describe('InvoicePaymentsService', () => {
  let prisma: PrismaMock;
  let events: { emitAsync: jest.Mock };
  let service: InvoicePaymentsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    events = { emitAsync: jest.fn().mockResolvedValue([]) };
    service = new InvoicePaymentsService(prisma as unknown as PrismaService, new CasesService(prisma as unknown as PrismaService), events as unknown as EventEmitter2);
    prisma.invoice.updateMany.mockResolvedValue({ count: 1 });
    prisma.invoice.findUniqueOrThrow.mockImplementation(async () => ({ id: 'inv-1', invoiceNumber: 'INV-2026-0002', amount: '800000.00', status: 'X' }));
  });

  describe('mark-paid (client)', () => {
    it('the client reports their SENT invoice as paid → AWAITING_CONFIRMATION with the time and note', async () => {
      prisma.invoice.findUnique.mockResolvedValue(invoiceRow('SENT'));

      await service.markPaid('inv-1', { paymentNote: '  Хаан банк, гүйлгээний утга INV-2026-0002 ' }, CLIENT_USER);

      expect(prisma.invoice.updateMany).toHaveBeenCalledWith({
        where: { id: 'inv-1', status: 'SENT' },
        data: {
          status: 'AWAITING_CONFIRMATION',
          paymentMarkedAt: expect.any(Date),
          paymentNote: 'Хаан банк, гүйлгээний утга INV-2026-0002',
          paymentRejectedAt: null,
          paymentRejectionReason: null,
        },
      });
      expect(events.emitAsync).toHaveBeenCalledWith(
        INVOICE_PAYMENT_EVENTS.marked,
        expect.objectContaining({ paymentNote: 'Хаан банк, гүйлгээний утга INV-2026-0002', invoice: expect.objectContaining({ invoiceNumber: 'INV-2026-0002', lawyerId: LAWYER_USER.id }) }),
      );
    });

    it('an OVERDUE invoice can be reported too, and an empty note is stored as null', async () => {
      prisma.invoice.findUnique.mockResolvedValue(invoiceRow('OVERDUE'));
      await service.markPaid('inv-1', { paymentNote: '   ' }, CLIENT_USER);
      expect(prisma.invoice.updateMany.mock.calls[0][0]).toMatchObject({ where: { status: 'OVERDUE' }, data: { paymentNote: null } });
    });

    it("another client cannot report someone else's invoice → 403, nothing written", async () => {
      prisma.invoice.findUnique.mockResolvedValue(invoiceRow('SENT'));
      await expect(service.markPaid('inv-1', {}, OTHER_CLIENT)).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.invoice.updateMany).not.toHaveBeenCalled();
      expect(events.emitAsync).not.toHaveBeenCalled();
    });

    it.each(['DRAFT', 'PAID', 'CANCELLED', 'AWAITING_CONFIRMATION'])('a %s invoice cannot be reported as paid → 400', async (status) => {
      prisma.invoice.findUnique.mockResolvedValue(invoiceRow(status));
      await expect(service.markPaid('inv-1', {}, CLIENT_USER)).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.invoice.updateMany).not.toHaveBeenCalled();
    });

    it('a concurrent status change is reported as 409 and emits nothing', async () => {
      prisma.invoice.findUnique.mockResolvedValue(invoiceRow('SENT'));
      prisma.invoice.updateMany.mockResolvedValue({ count: 0 });
      await expect(service.markPaid('inv-1', {}, CLIENT_USER)).rejects.toBeInstanceOf(ConflictException);
      expect(events.emitAsync).not.toHaveBeenCalled();
    });
  });

  describe('confirm / reject (staff)', () => {
    it('ADMIN confirms → PAID with paidAt and confirmedById', async () => {
      prisma.invoice.findUnique.mockResolvedValue(invoiceRow('AWAITING_CONFIRMATION'));

      await service.confirm('inv-1', ADMIN_USER);

      expect(prisma.invoice.updateMany).toHaveBeenCalledWith({
        where: { id: 'inv-1', status: 'AWAITING_CONFIRMATION' },
        data: { status: 'PAID', paidAt: expect.any(Date), confirmedById: ADMIN_USER.id },
      });
      expect(events.emitAsync).toHaveBeenCalledWith(INVOICE_PAYMENT_EVENTS.confirmed, expect.objectContaining({ actorId: ADMIN_USER.id }));
    });

    it('the assigned lawyer may confirm as well', async () => {
      prisma.invoice.findUnique.mockResolvedValue(invoiceRow('AWAITING_CONFIRMATION'));
      await service.confirm('inv-1', LAWYER_USER);
      expect(prisma.invoice.updateMany.mock.calls[0][0].data).toMatchObject({ confirmedById: LAWYER_USER.id });
    });

    it.each([
      ['the client', CLIENT_USER],
      ['another lawyer', OTHER_LAWYER],
    ])('%s cannot confirm → 403', async (_label, user) => {
      prisma.invoice.findUnique.mockResolvedValue(invoiceRow('AWAITING_CONFIRMATION'));
      await expect(service.confirm('inv-1', user)).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.invoice.updateMany).not.toHaveBeenCalled();
    });

    it('confirming an invoice nobody reported (SENT) → 400', async () => {
      prisma.invoice.findUnique.mockResolvedValue(invoiceRow('SENT'));
      await expect(service.confirm('inv-1', ADMIN_USER)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('reject sends it back to SENT with the reason, and the client can report it again', async () => {
      prisma.invoice.findUnique.mockResolvedValueOnce(invoiceRow('AWAITING_CONFIRMATION'));
      await service.reject('inv-1', { reason: ' Дүн зөрсөн ' }, LAWYER_USER);
      expect(prisma.invoice.updateMany).toHaveBeenLastCalledWith({
        where: { id: 'inv-1', status: 'AWAITING_CONFIRMATION' },
        data: { status: 'SENT', paymentRejectedAt: expect.any(Date), paymentRejectionReason: 'Дүн зөрсөн', paidAt: null, confirmedById: null },
      });
      expect(events.emitAsync).toHaveBeenLastCalledWith(INVOICE_PAYMENT_EVENTS.rejected, expect.objectContaining({ reason: 'Дүн зөрсөн' }));

      prisma.invoice.findUnique.mockResolvedValueOnce(invoiceRow('SENT'));
      await service.markPaid('inv-1', { paymentNote: 'Зөв дүнгээр дахин шилжүүлсэн' }, CLIENT_USER);
      expect(prisma.invoice.updateMany).toHaveBeenLastCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'AWAITING_CONFIRMATION', paymentRejectionReason: null }) }),
      );
    });

    it('rejecting a PAID invoice → 400', async () => {
      prisma.invoice.findUnique.mockResolvedValue(invoiceRow('PAID'));
      await expect(service.reject('inv-1', { reason: 'Буруу' }, ADMIN_USER)).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  it('the summary counts AWAITING_CONFIRMATION invoices inside the lawyer scope', async () => {
    prisma.invoice.findMany.mockResolvedValue([
      { id: 'inv-1', invoiceNumber: 'INV-2026-0002', amount: '800000.00', paymentMarkedAt: new Date('2026-09-14T08:00:00Z'), case: { id: 'case-1', caseNumber: 'LF-2026-0001' } },
    ]);
    prisma.invoice.count.mockResolvedValue(1);

    const summary = await service.summary(LAWYER_USER);

    expect(prisma.invoice.count).toHaveBeenCalledWith({ where: { status: 'AWAITING_CONFIRMATION', case: { members: { some: { userId: LAWYER_USER.id } } } } });
    expect(summary).toEqual({
      total: 1,
      invoices: [{ id: 'inv-1', invoiceNumber: 'INV-2026-0002', amount: '800000.00', caseId: 'case-1', caseNumber: 'LF-2026-0001', paymentMarkedAt: new Date('2026-09-14T08:00:00Z') }],
    });
  });

  it('PATCH cannot move an invoice into or out of AWAITING_CONFIRMATION (dedicated actions only)', async () => {
    const invoices = new InvoicesService(
      prisma as unknown as PrismaService,
      new CasesService(prisma as unknown as PrismaService),
      { createMany: jest.fn() } as unknown as NotificationsService,
    );
    const row = (status: string) => ({ id: 'inv-1', invoiceNumber: 'INV-2026-0002', status, dueDate: new Date(), amount: '800000.00', case: invoiceRow(status).case });

    prisma.invoice.findUnique.mockResolvedValueOnce(row('SENT'));
    await expect(invoices.update('inv-1', { status: 'AWAITING_CONFIRMATION' }, ADMIN_USER)).rejects.toBeInstanceOf(BadRequestException);
    prisma.invoice.findUnique.mockResolvedValueOnce(row('AWAITING_CONFIRMATION'));
    await expect(invoices.update('inv-1', { status: 'PAID' }, ADMIN_USER)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.invoice.update).not.toHaveBeenCalled();
  });
});
