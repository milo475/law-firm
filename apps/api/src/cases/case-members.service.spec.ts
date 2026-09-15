import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import { ADMIN_USER, CLIENT_USER, LAWYER_USER, OTHER_LAWYER, createPrismaMock, type PrismaMock } from '../common/testing/mocks';
import type { RequestUser } from '../common/types/request-user';
import { PrismaService } from '../prisma/prisma.service';
import { CASE_MEMBER_EVENTS } from './case-member.events';
import { CaseMembersService } from './case-members.service';
import { CasesService } from './cases.service';

const MEMBER_LAWYER: RequestUser = { id: 'member-lawyer-id', email: 'member@lawfirm.mn', role: 'LAWYER' };
const teamCase = {
  id: 'case-1',
  caseNumber: 'LF-2026-0001',
  title: 'Түрээсийн маргаан',
  clientId: CLIENT_USER.id,
  lawyerId: LAWYER_USER.id,
  status: 'IN_PROGRESS',
  members: [
    { userId: LAWYER_USER.id, role: 'LEAD' },
    { userId: MEMBER_LAWYER.id, role: 'MEMBER' },
  ],
};
const USERS: Record<string, { id: string; role: string; isActive: boolean }> = {
  'new-lawyer-id': { id: 'new-lawyer-id', role: 'LAWYER', isActive: true },
  [MEMBER_LAWYER.id]: { id: MEMBER_LAWYER.id, role: 'LAWYER', isActive: true },
  'admin-2': { id: 'admin-2', role: 'ADMIN', isActive: true },
  [CLIENT_USER.id]: { id: CLIENT_USER.id, role: 'CLIENT', isActive: true },
  'inactive-id': { id: 'inactive-id', role: 'LAWYER', isActive: false },
};

describe('CaseMembersService', () => {
  let prisma: PrismaMock;
  let events: { emitAsync: jest.Mock };
  let service: CaseMembersService;

  beforeEach(() => {
    prisma = createPrismaMock();
    events = { emitAsync: jest.fn().mockResolvedValue([]) };
    service = new CaseMembersService(prisma as unknown as PrismaService, new CasesService(prisma as unknown as PrismaService), events as unknown as EventEmitter2);
    prisma.case.findUnique.mockResolvedValue(teamCase);
    prisma.user.findUnique.mockImplementation(async ({ where }: any) => USERS[where.id] ?? null);
    prisma.caseMember.findUnique.mockResolvedValue(null);
    prisma.caseMember.create.mockImplementation(async ({ data }: any) => ({ id: 'member-row', ...data }));
    prisma.caseMember.update.mockImplementation(async ({ where, data }: any) => ({ ...where.caseId_userId, ...data }));
  });

  it('the LEAD adds a lawyer as MEMBER and case.member-added is emitted', async () => {
    await service.add('case-1', { userId: 'new-lawyer-id', role: 'MEMBER' }, LAWYER_USER);

    expect(prisma.caseMember.create.mock.calls[0][0].data).toEqual({ caseId: 'case-1', userId: 'new-lawyer-id', role: 'MEMBER', addedById: LAWYER_USER.id });
    expect(events.emitAsync).toHaveBeenCalledWith(CASE_MEMBER_EVENTS.added, {
      caseRef: { id: 'case-1', caseNumber: 'LF-2026-0001', title: 'Түрээсийн маргаан' },
      userId: 'new-lawyer-id',
      role: 'MEMBER',
      actorId: LAWYER_USER.id,
    });
  });

  it('ADMIN may add another admin as a MEMBER', async () => {
    await service.add('case-1', { userId: 'admin-2', role: 'MEMBER' }, ADMIN_USER);
    expect(prisma.caseMember.create).toHaveBeenCalledTimes(1);
  });

  it('a team MEMBER who is not the LEAD cannot add people → 403', async () => {
    await expect(service.add('case-1', { userId: 'new-lawyer-id', role: 'MEMBER' }, MEMBER_LAWYER)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.caseMember.create).not.toHaveBeenCalled();
    expect(events.emitAsync).not.toHaveBeenCalled();
  });

  it('a lawyer outside the team can neither add nor list the team → 403', async () => {
    await expect(service.add('case-1', { userId: 'new-lawyer-id', role: 'MEMBER' }, OTHER_LAWYER)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.list('case-1', OTHER_LAWYER)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.caseMember.findMany).not.toHaveBeenCalled();
  });

  it('team members see the team list; clients do not → 403', async () => {
    prisma.caseMember.findMany.mockResolvedValue([]);
    await service.list('case-1', MEMBER_LAWYER);
    expect(prisma.caseMember.findMany).toHaveBeenCalledTimes(1);
    await expect(service.list('case-1', CLIENT_USER)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it.each([
    ['a client', CLIENT_USER.id],
    ['an inactive lawyer', 'inactive-id'],
    ['an unknown user', 'missing-id'],
  ])('%s cannot join the team → 400', async (_label, userId) => {
    await expect(service.add('case-1', { userId, role: 'MEMBER' }, LAWYER_USER)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.caseMember.create).not.toHaveBeenCalled();
  });

  it('adding someone who is already on the team → 409', async () => {
    prisma.caseMember.findUnique.mockResolvedValue({ id: 'existing' });
    await expect(service.add('case-1', { userId: 'new-lawyer-id', role: 'MEMBER' }, LAWYER_USER)).rejects.toBeInstanceOf(ConflictException);
  });

  it('only a lawyer can be made LEAD → 400 for an admin', async () => {
    await expect(service.add('case-1', { userId: 'admin-2', role: 'LEAD' }, ADMIN_USER)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('adding with role LEAD hands the lead over in one transaction', async () => {
    await service.add('case-1', { userId: 'new-lawyer-id', role: 'LEAD' }, ADMIN_USER);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.caseMember.updateMany).toHaveBeenCalledWith({ where: { caseId: 'case-1', role: 'LEAD' }, data: { role: 'MEMBER' } });
    expect(prisma.caseMember.create.mock.calls[0][0].data).toMatchObject({ userId: 'new-lawyer-id', role: 'LEAD' });
    expect(prisma.case.update).toHaveBeenCalledWith({ where: { id: 'case-1' }, data: { lawyerId: 'new-lawyer-id' } });
  });

  it('promoting a MEMBER to LEAD demotes the current LEAD and moves the case lawyerId', async () => {
    prisma.caseMember.findUnique.mockResolvedValue({ userId: MEMBER_LAWYER.id, role: 'MEMBER' });

    await service.updateRole('case-1', MEMBER_LAWYER.id, { role: 'LEAD' }, LAWYER_USER);

    expect(prisma.caseMember.updateMany).toHaveBeenCalledWith({ where: { caseId: 'case-1', role: 'LEAD' }, data: { role: 'MEMBER' } });
    expect(prisma.caseMember.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { caseId_userId: { caseId: 'case-1', userId: MEMBER_LAWYER.id } }, data: { role: 'LEAD' } }),
    );
    expect(prisma.case.update).toHaveBeenCalledWith({ where: { id: 'case-1' }, data: { lawyerId: MEMBER_LAWYER.id } });
  });

  it('the LEAD cannot be demoted directly → 400', async () => {
    prisma.caseMember.findUnique.mockResolvedValue({ userId: LAWYER_USER.id, role: 'LEAD' });
    await expect(service.updateRole('case-1', LAWYER_USER.id, { role: 'MEMBER' }, ADMIN_USER)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.caseMember.updateMany).not.toHaveBeenCalled();
  });

  it('removing a MEMBER deletes the row; removing the LEAD → 400', async () => {
    prisma.caseMember.findUnique.mockResolvedValueOnce({ userId: MEMBER_LAWYER.id, role: 'MEMBER' });
    await service.remove('case-1', MEMBER_LAWYER.id, LAWYER_USER);
    expect(prisma.caseMember.delete).toHaveBeenCalledWith({ where: { caseId_userId: { caseId: 'case-1', userId: MEMBER_LAWYER.id } } });

    prisma.caseMember.findUnique.mockResolvedValueOnce({ userId: LAWYER_USER.id, role: 'LEAD' });
    await expect(service.remove('case-1', LAWYER_USER.id, ADMIN_USER)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.caseMember.delete).toHaveBeenCalledTimes(1);
  });

  it('a MEMBER cannot remove a teammate → 403', async () => {
    await expect(service.remove('case-1', 'new-lawyer-id', MEMBER_LAWYER)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
