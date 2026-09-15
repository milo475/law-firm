import { z } from 'zod';
import type { CaseMemberRole } from '../generated/prisma/enums.js';

export const CASE_MEMBER_ROLES = ['LEAD', 'MEMBER'] as const satisfies readonly CaseMemberRole[];
export const CaseMemberRoleSchema = z.enum(CASE_MEMBER_ROLES, { message: 'Гишүүний үүрэг буруу байна' });

/** POST /cases/:id/members — LAWYER or ADMIN user; LEAD transfers the lead role to them. */
export const CreateCaseMemberSchema = z.object({
  userId: z.uuid({ message: 'Ажилтнаа сонгоно уу' }),
  role: CaseMemberRoleSchema.default('MEMBER'),
});
export type CreateCaseMemberInput = z.infer<typeof CreateCaseMemberSchema>;

/** PATCH /cases/:id/members/:userId — setting LEAD hands the lead over; the current LEAD cannot be demoted directly. */
export const UpdateCaseMemberSchema = z.object({
  role: CaseMemberRoleSchema,
});
export type UpdateCaseMemberInput = z.infer<typeof UpdateCaseMemberSchema>;
