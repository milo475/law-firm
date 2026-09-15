import { BadRequestException } from '@nestjs/common';
import { createPrismaMock, type PrismaMock } from '../common/testing/mocks';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { ContactService } from './contact.service';

describe('ContactService.updateStatus', () => {
  let service: ContactService;
  let prisma: PrismaMock;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new ContactService(prisma as unknown as PrismaService, { createMany: jest.fn() } as unknown as NotificationsService);
    prisma.contactRequest.update.mockImplementation(async ({ data }: any) => ({ id: 'req-1', ...data }));
  });

  it('NEW → CONTACTED is allowed', async () => {
    prisma.contactRequest.findUnique.mockResolvedValue({ id: 'req-1', status: 'NEW' });
    await expect(service.updateStatus('req-1', 'CONTACTED')).resolves.toMatchObject({ status: 'CONTACTED' });
  });

  it('CLOSED → NEW is rejected with 400', async () => {
    prisma.contactRequest.findUnique.mockResolvedValue({ id: 'req-1', status: 'CLOSED' });
    await expect(service.updateStatus('req-1', 'NEW')).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.contactRequest.update).not.toHaveBeenCalled();
  });
});
