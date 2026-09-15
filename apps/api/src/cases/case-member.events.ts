import type { CaseMemberRole } from '@law-firm/shared';

export const CASE_MEMBER_EVENTS = {
  added: 'case.member-added',
} as const;

export interface CaseMemberAddedEvent {
  caseRef: { id: string; caseNumber: string; title: string };
  userId: string;
  role: CaseMemberRole;
  actorId: string;
}
