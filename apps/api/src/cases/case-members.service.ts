import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  CaseMemberRole,
  Role,
  type CreateCaseMemberInput,
  type Prisma,
  type UpdateCaseMemberInput,
} from '@law-firm/shared';
import type { RequestUser } from '../common/types/request-user';
import { PUBLIC_USER_SELECT } from '../common/utils/safe-user';
import { PrismaService } from '../prisma/prisma.service';
import { CASE_MEMBER_EVENTS, type CaseMemberAddedEvent } from './case-member.events';
import { CasesService } from './cases.service';

const MEMBER_SELECT = {
  id: true,
  caseId: true,
  userId: true,
  role: true,
  createdAt: true,
  user: { select: { ...PUBLIC_USER_SELECT, email: true } },
  addedBy: { select: PUBLIC_USER_SELECT },
} satisfies Prisma.CaseMemberSelect;

/**
 * Case team. The case's lawyerId is always its single LEAD member: handing the lead over updates both.
 * Any team member works on the case; only the LEAD (or ADMIN) manages the team.
 */
@Injectable()
export class CaseMembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cases: CasesService,
    private readonly events: EventEmitter2,
  ) {}

  /** Team list for anyone working on the case (ADMIN or a team LAWYER). */
  async list(caseId: string, user: RequestUser) {
    await this.cases.assertStaffAccessById(caseId, user);
    return this.prisma.caseMember.findMany({
      where: { caseId },
      select: MEMBER_SELECT,
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    });
  }

  /** Active lawyers and admins not on the team yet (for the "add member" picker). */
  async candidates(caseId: string, user: RequestUser) {
    await this.cases.assertLeadAccessById(caseId, user);
    return this.prisma.user.findMany({
      where: { role: { in: [Role.LAWYER, Role.ADMIN] }, isActive: true, caseMemberships: { none: { caseId } } },
      select: { ...PUBLIC_USER_SELECT, email: true },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
  }

  async add(caseId: string, input: CreateCaseMemberInput, user: RequestUser) {
    const record = await this.cases.assertLeadAccessById(caseId, user);
    await this.assertStaffUser(input.userId, input.role);
    const existing = await this.prisma.caseMember.findUnique({ where: { caseId_userId: { caseId, userId: input.userId } } });
    if (existing) throw new ConflictException('Энэ ажилтан аль хэдийн багт байна');

    const member =
      input.role === CaseMemberRole.LEAD
        ? await this.prisma.$transaction(async (tx) => {
            await this.demoteCurrentLead(tx, caseId);
            const created = await tx.caseMember.create({
              data: { caseId, userId: input.userId, role: CaseMemberRole.LEAD, addedById: user.id },
              select: MEMBER_SELECT,
            });
            await tx.case.update({ where: { id: caseId }, data: { lawyerId: input.userId } });
            return created;
          })
        : await this.prisma.caseMember.create({
            data: { caseId, userId: input.userId, role: CaseMemberRole.MEMBER, addedById: user.id },
            select: MEMBER_SELECT,
          });

    const event: CaseMemberAddedEvent = {
      caseRef: { id: caseId, caseNumber: record.caseNumber, title: record.title },
      userId: input.userId,
      role: input.role,
      actorId: user.id,
    };
    await this.events.emitAsync(CASE_MEMBER_EVENTS.added, event);
    return member;
  }

  /** Setting LEAD hands the lead over (the previous LEAD becomes a MEMBER and the case's lawyerId follows). */
  async updateRole(caseId: string, userId: string, input: UpdateCaseMemberInput, user: RequestUser) {
    await this.cases.assertLeadAccessById(caseId, user);
    const member = await this.findMember(caseId, userId);
    if (member.role === input.role) return member;
    if (input.role === CaseMemberRole.MEMBER) {
      throw new BadRequestException('Ахлах хуульчийг шууд гишүүн болгох боломжгүй. Эхлээд өөр хуульчийг ахлахаар томилно уу');
    }

    await this.assertStaffUser(userId, CaseMemberRole.LEAD);
    return this.prisma.$transaction(async (tx) => {
      await this.demoteCurrentLead(tx, caseId);
      const updated = await tx.caseMember.update({
        where: { caseId_userId: { caseId, userId } },
        data: { role: CaseMemberRole.LEAD },
        select: MEMBER_SELECT,
      });
      await tx.case.update({ where: { id: caseId }, data: { lawyerId: userId } });
      return updated;
    });
  }

  /** The LEAD cannot be removed: appoint another LEAD first. */
  async remove(caseId: string, userId: string, user: RequestUser): Promise<void> {
    await this.cases.assertLeadAccessById(caseId, user);
    const member = await this.findMember(caseId, userId);
    if (member.role === CaseMemberRole.LEAD) {
      throw new BadRequestException('Ахлах хуульчийг багаас хасах боломжгүй. Эхлээд өөр хуульчийг ахлахаар томилно уу');
    }
    await this.prisma.caseMember.delete({ where: { caseId_userId: { caseId, userId } } });
  }

  // ─── helpers ───────────────────────────────────────────────────────────────

  private async findMember(caseId: string, userId: string) {
    const member = await this.prisma.caseMember.findUnique({ where: { caseId_userId: { caseId, userId } }, select: MEMBER_SELECT });
    if (!member) throw new NotFoundException('Энэ ажилтан хэргийн багт байхгүй байна');
    return member;
  }

  private async assertStaffUser(userId: string, role: CaseMemberRole): Promise<void> {
    const target = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true, isActive: true } });
    if (!target || !target.isActive || (target.role !== Role.LAWYER && target.role !== Role.ADMIN)) {
      throw new BadRequestException('Хэргийн багт зөвхөн идэвхтэй хуульч эсвэл админ нэмнэ');
    }
    if (role === CaseMemberRole.LEAD && target.role !== Role.LAWYER) {
      throw new BadRequestException('Ахлахаар зөвхөн хуульч томилно');
    }
  }

  private demoteCurrentLead(tx: Prisma.TransactionClient, caseId: string) {
    return tx.caseMember.updateMany({ where: { caseId, role: CaseMemberRole.LEAD }, data: { role: CaseMemberRole.MEMBER } });
  }
}
