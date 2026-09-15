import { z } from 'zod';
import { CaseType, ServiceRequestStatus, ServiceRequestType } from '../generated/prisma/enums.js';
import { PaginationSchema } from './common.js';

export const ServiceRequestTypeSchema = z.enum(ServiceRequestType, { message: 'Хүсэлтийн төрлөө сонгоно уу' });
export const ServiceRequestStatusSchema = z.enum(ServiceRequestStatus, { message: 'Хүсэлтийн төлөв буруу байна' });
const RequestCaseTypeSchema = z.enum(CaseType, { message: 'Асуудлын чиглэлээ сонгоно уу' });

/** POST /service-requests (CLIENT) — the title and description become the case title and description when it is assigned. */
export const CreateServiceRequestSchema = z.object({
  type: ServiceRequestTypeSchema,
  caseType: RequestCaseTypeSchema,
  title: z
    .string({ message: 'Гарчиг оруулна уу' })
    .trim()
    .min(5, 'Гарчиг хамгийн багадаа 5 тэмдэгт байна')
    .max(200, 'Гарчиг 200 тэмдэгтээс хэтрэхгүй байна'),
  description: z
    .string({ message: 'Юу болсныг тайлбарлана уу' })
    .trim()
    .min(30, 'Юу болсон, юу хийснээ дор хаяж 30 тэмдэгтээр тайлбарлана уу')
    .max(5000, 'Тайлбар 5000 тэмдэгтээс хэтрэхгүй байна'),
});
export type CreateServiceRequestInput = z.infer<typeof CreateServiceRequestSchema>;

/** POST /service-requests/:id/reject (ADMIN) — the requester sees the reason in the portal and in a notification. */
export const RejectServiceRequestSchema = z.object({
  rejectionReason: z
    .string({ message: 'Татгалзах шалтгааныг бичнэ үү' })
    .trim()
    .min(5, 'Татгалзах шалтгааныг бичнэ үү')
    .max(1000, 'Шалтгаан 1000 тэмдэгтээс хэтрэхгүй байна'),
});
export type RejectServiceRequestInput = z.infer<typeof RejectServiceRequestSchema>;

/**
 * POST /service-requests/:id/assign (ADMIN) — either one lawyer (`lawyerId`) or a team (`leadId` + `memberIds`).
 * Assigning opens the case in the same step, so the request goes straight from ACCEPTED to CONVERTED.
 */
export const AssignServiceRequestSchema = z
  .object({
    lawyerId: z.uuid({ message: 'Өмгөөлөгч сонгоно уу' }).optional(),
    leadId: z.uuid({ message: 'Ахлах өмгөөлөгч сонгоно уу' }).optional(),
    memberIds: z.array(z.uuid({ message: 'Багийн гишүүн буруу байна' })).max(10, 'Багт хамгийн ихдээ 10 гишүүн нэмнэ').optional(),
  })
  .superRefine((value, ctx) => {
    const team = value.leadId !== undefined || value.memberIds !== undefined;
    if (value.lawyerId && team) {
      ctx.addIssue({ code: 'custom', path: ['lawyerId'], message: 'Нэг өмгөөлөгч эсвэл баг — аль нэгийг нь сонгоно уу' });
      return;
    }
    if (!value.lawyerId && !team) {
      ctx.addIssue({ code: 'custom', path: ['lawyerId'], message: 'Өмгөөлөгч эсвэл баг сонгоно уу' });
      return;
    }
    if (!team) return;
    const members = value.memberIds ?? [];
    if (!value.leadId) ctx.addIssue({ code: 'custom', path: ['leadId'], message: 'Багийн ахлах өмгөөлөгчийг сонгоно уу' });
    if (members.length === 0) ctx.addIssue({ code: 'custom', path: ['memberIds'], message: 'Багт дор хаяж нэг гишүүн нэмнэ үү' });
    if (value.leadId && members.includes(value.leadId)) {
      ctx.addIssue({ code: 'custom', path: ['memberIds'], message: 'Ахлах өмгөөлөгчийг гишүүдэд давхар оруулахгүй' });
    }
    if (new Set(members).size !== members.length) ctx.addIssue({ code: 'custom', path: ['memberIds'], message: 'Гишүүн давхардсан байна' });
  });
export type AssignServiceRequestInput = z.infer<typeof AssignServiceRequestSchema>;

/** The lead (Case.lawyerId, CaseMember LEAD) and the other members; a single lawyer is a team of one. */
export function assignmentTeam(input: AssignServiceRequestInput): { leadId: string; memberIds: string[] } {
  if (input.lawyerId) return { leadId: input.lawyerId, memberIds: [] };
  const leadId = input.leadId as string;
  return { leadId, memberIds: [...new Set(input.memberIds ?? [])].filter((id) => id !== leadId) };
}

/**
 * NEW → ACCEPTED (accept) or → REJECTED; ACCEPTED → CONVERTED (assign: a case is opened) or → REJECTED.
 * REJECTED and CONVERTED are final, so a request can never be assigned twice.
 */
export const SERVICE_REQUEST_STATUS_TRANSITIONS: Record<ServiceRequestStatus, readonly ServiceRequestStatus[]> = {
  NEW: ['ACCEPTED', 'REJECTED'],
  ACCEPTED: ['CONVERTED', 'REJECTED'],
  REJECTED: [],
  CONVERTED: [],
};

export function canTransitionServiceRequest(from: ServiceRequestStatus, to: ServiceRequestStatus): boolean {
  return SERVICE_REQUEST_STATUS_TRANSITIONS[from].includes(to);
}

/** GET /service-requests (ADMIN) */
export const ServiceRequestQuerySchema = PaginationSchema.extend({
  status: ServiceRequestStatusSchema.optional(),
  type: ServiceRequestTypeSchema.optional(),
  caseType: RequestCaseTypeSchema.optional(),
});
export type ServiceRequestQueryInput = z.infer<typeof ServiceRequestQuerySchema>;

/** GET /service-requests/summary (ADMIN) — sidebar and dashboard badge. */
export interface ServiceRequestSummary {
  new: number;
  accepted: number;
}
