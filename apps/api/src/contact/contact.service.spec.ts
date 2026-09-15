import { createPrismaMock, type PrismaMock } from '../common/testing/mocks';
import { PrismaService } from '../prisma/prisma.service';
import { ContactService } from './contact.service';

describe('ContactService (legacy contact form, read-only)', () => {
  let service: ContactService;
  let prisma: PrismaMock;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new ContactService(prisma as unknown as PrismaService);
  });

  it('lists the old messages newest first, filtered by status', async () => {
    prisma.contactRequest.findMany.mockResolvedValue([{ id: 'c1', status: 'NEW' }]);
    prisma.contactRequest.count.mockResolvedValue(1);

    await expect(service.findAll({ page: 1, limit: 20, status: 'NEW' })).resolves.toMatchObject({ items: [{ id: 'c1' }], total: 1 });
    expect(prisma.contactRequest.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { status: 'NEW' }, orderBy: { createdAt: 'desc' } }));
  });
});
