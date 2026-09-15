import { EventEmitterModule } from '@nestjs/event-emitter';
import { Test, type TestingModule } from '@nestjs/testing';
import { CasesService } from '../cases/cases.service';
import { ADMIN_USER, CLIENT_USER, LAWYER_USER, createPrismaMock, type PrismaMock } from '../common/testing/mocks';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { InvoicePaymentNotificationsListener } from './invoice-payment-notifications.listener';
import { InvoicePaymentsService } from './invoice-payments.service';

const invoiceRow = (status: string) => ({
  id: 'inv-1',
  invoiceNumber: 'INV-2026-0002',
  amount: '800000.00',
  status,
  case: { id: 'case-1', caseNumber: 'LF-2026-0001', clientId: CLIENT_USER.id, lawyerId: LAWYER_USER.id },
});

describe('Invoice payment events → notifications (EventEmitter2 wiring)', () => {
  let moduleRef: TestingModule;
  let service: InvoicePaymentsService;
  let prisma: PrismaMock;
  let notifications: { createMany: jest.Mock };

  beforeEach(async () => {
    prisma = createPrismaMock();
    notifications = { createMany: jest.fn().mockResolvedValue({ count: 1 }) };
    moduleRef = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [
        InvoicePaymentsService,
        InvoicePaymentNotificationsListener,
        CasesService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notifications },
      ],
    }).compile();
    await moduleRef.init();
    service = moduleRef.get(InvoicePaymentsService);
    prisma.invoice.updateMany.mockResolvedValue({ count: 1 });
    prisma.invoice.findUniqueOrThrow.mockResolvedValue({ id: 'inv-1', amount: '800000.00' });
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  const sent = () => notifications.createMany.mock.calls.flatMap(([inputs]) => inputs);

  it('invoice.payment-marked → the assigned lawyer and every active admin, once each', async () => {
    prisma.invoice.findUnique.mockResolvedValue(invoiceRow('SENT'));
    prisma.user.findMany.mockResolvedValue([{ id: ADMIN_USER.id }, { id: 'admin-2' }]);

    await service.markPaid('inv-1', { paymentNote: 'Гүйлгээний утга INV-2026-0002' }, CLIENT_USER);

    expect(prisma.user.findMany).toHaveBeenCalledWith({ where: { role: 'ADMIN', isActive: true }, select: { id: true } });
    expect(sent()).toEqual(
      [LAWYER_USER.id, ADMIN_USER.id, 'admin-2'].map((userId) => ({
        userId,
        type: 'INVOICE',
        title: 'Төлбөр хийгдсэн гэж тэмдэглэлээ, баталгаажуулна уу: INV-2026-0002',
        body: 'LF-2026-0001 · 800 000₮ · Гүйлгээний утга INV-2026-0002',
        link: '/admin/invoices/inv-1',
      })),
    );
  });

  it('invoice.payment-confirmed → the client', async () => {
    prisma.invoice.findUnique.mockResolvedValue(invoiceRow('AWAITING_CONFIRMATION'));
    await service.confirm('inv-1', ADMIN_USER);
    expect(sent()).toEqual([
      { userId: CLIENT_USER.id, type: 'INVOICE', title: 'Төлбөр баталгаажлаа: INV-2026-0002', body: '800 000₮ · LF-2026-0001', link: '/portal/invoices/inv-1' },
    ]);
  });

  it('invoice.payment-rejected → the client, with the reason', async () => {
    prisma.invoice.findUnique.mockResolvedValue(invoiceRow('AWAITING_CONFIRMATION'));
    await service.reject('inv-1', { reason: 'Гүйлгээ олдсонгүй' }, LAWYER_USER);
    expect(sent()).toEqual([
      expect.objectContaining({ userId: CLIENT_USER.id, title: 'Төлбөр баталгаажсангүй: Гүйлгээ олдсонгүй', link: '/portal/invoices/inv-1' }),
    ]);
  });

  it('a failing notification insert does not fail the confirmation', async () => {
    prisma.invoice.findUnique.mockResolvedValue(invoiceRow('AWAITING_CONFIRMATION'));
    notifications.createMany.mockRejectedValue(new Error('db down'));
    await expect(service.confirm('inv-1', ADMIN_USER)).resolves.toMatchObject({ id: 'inv-1' });
  });
});
