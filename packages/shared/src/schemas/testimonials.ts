import { z } from 'zod';
import { CaseType, TestimonialSource, TestimonialStatus } from '../generated/prisma/enums.js';
import { PaginationSchema } from './common.js';

export const TestimonialStatusSchema = z.enum(TestimonialStatus, { message: 'Сэтгэгдлийн төлөв буруу байна' });
export const TestimonialSourceSchema = z.enum(TestimonialSource, { message: 'Сэтгэгдлийн эх сурвалж буруу байна' });
const TestimonialCaseTypeSchema = z.enum(CaseType, { message: 'Чиглэл буруу байна' });

export const TESTIMONIAL_BODY_MIN = 30;
export const TESTIMONIAL_BODY_MAX = 1000;

const BodySchema = z
  .string({ message: 'Сэтгэгдлээ бичнэ үү' })
  .trim()
  .min(TESTIMONIAL_BODY_MIN, `Сэтгэгдэл хамгийн багадаа ${TESTIMONIAL_BODY_MIN} тэмдэгт байна`)
  .max(TESTIMONIAL_BODY_MAX, `Сэтгэгдэл ${TESTIMONIAL_BODY_MAX} тэмдэгтээс хэтрэхгүй байна`);

const RatingSchema = z.coerce
  .number({ message: 'Үнэлгээ 1-5 хооронд байна' })
  .int('Үнэлгээ бүхэл тоо байна')
  .min(1, 'Үнэлгээ 1-5 хооронд байна')
  .max(5, 'Үнэлгээ 1-5 хооронд байна');

const AuthorNameSchema = z
  .string({ message: 'Зохиогчийн нэрийг бичнэ үү' })
  .trim()
  .min(2, 'Нэр хамгийн багадаа 2 тэмдэгт байна')
  .max(120, 'Нэр 120 тэмдэгтээс хэтрэхгүй байна');

const AuthorTitleSchema = z.string().trim().max(160, 'Албан тушаал 160 тэмдэгтээс хэтрэхгүй байна');

const ConsentNoteSchema = z.string().trim().max(500, 'Зөвшөөрлийн тэмдэглэл 500 тэмдэгтээс хэтрэхгүй байна');

/**
 * POST /testimonials (CLIENT) — the client writes about a closed case of their own.
 * Consent is part of the request on purpose: a testimonial may never be stored as publishable
 * without the client ticking the box themselves.
 */
export const CreateTestimonialSchema = z.object({
  caseId: z.uuid({ message: 'Хэрэг буруу байна' }),
  body: BodySchema,
  rating: RatingSchema.optional(),
  consentGiven: z.literal(true, { message: 'Нэрийг тань нийтлэх зөвшөөрлийг тэмдэглэнэ үү' }),
});
export type CreateTestimonialInput = z.infer<typeof CreateTestimonialSchema>;

/** POST /admin/testimonials (ADMIN, LAWYER) — something that arrived by e-mail, Facebook or word of mouth. */
export const CreateManualTestimonialSchema = z.object({
  authorName: AuthorNameSchema,
  authorTitle: AuthorTitleSchema.optional(),
  body: BodySchema,
  rating: RatingSchema.optional(),
  caseType: TestimonialCaseTypeSchema.optional(),
  consentGiven: z.boolean().default(false),
  consentNote: ConsentNoteSchema.optional(),
  isFeatured: z.boolean().default(false),
  displayOrder: z.coerce.number().int().min(0, 'Эрэмбэ 0-ээс бага байж болохгүй').max(9999).default(0),
});
export type CreateManualTestimonialInput = z.infer<typeof CreateManualTestimonialSchema>;

/**
 * PATCH /admin/testimonials/:id (ADMIN, LAWYER) — edit, change the status, reorder, feature.
 * Setting PUBLISHED requires consent; the service refuses otherwise (see TestimonialsService.update).
 */
export const UpdateTestimonialSchema = z
  .object({
    authorName: AuthorNameSchema,
    authorTitle: AuthorTitleSchema.nullable(),
    body: BodySchema,
    rating: RatingSchema.nullable(),
    caseType: TestimonialCaseTypeSchema.nullable(),
    status: TestimonialStatusSchema,
    consentGiven: z.boolean(),
    consentNote: ConsentNoteSchema.nullable(),
    isFeatured: z.boolean(),
    displayOrder: z.coerce.number().int().min(0, 'Эрэмбэ 0-ээс бага байж болохгүй').max(9999),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, { message: 'Өөрчлөх утгаа сонгоно уу' });
export type UpdateTestimonialInput = z.infer<typeof UpdateTestimonialSchema>;

/** GET /admin/testimonials (ADMIN, LAWYER) */
export const TestimonialQuerySchema = PaginationSchema.extend({
  status: TestimonialStatusSchema.optional(),
  source: TestimonialSourceSchema.optional(),
  caseType: TestimonialCaseTypeSchema.optional(),
});
export type TestimonialQueryInput = z.infer<typeof TestimonialQuerySchema>;

/** GET /testimonials — public; only PUBLISHED rows come back. */
export const PublicTestimonialQuerySchema = z.object({
  caseType: TestimonialCaseTypeSchema.optional(),
  featured: z.stringbool().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});
export type PublicTestimonialQueryInput = z.infer<typeof PublicTestimonialQuerySchema>;

/**
 * Everything the public endpoint is allowed to return. Anything identifying beyond the name the
 * client agreed to (the user id, the case, contact details) stays inside the admin API.
 */
export interface PublicTestimonial {
  id: string;
  authorName: string;
  authorTitle: string | null;
  body: string;
  rating: number | null;
  caseType: CaseType | null;
  publishedAt: Date | string | null;
}

/** PENDING ⇄ PUBLISHED ⇄ REJECTED — staff may move a testimonial between any of the three. */
export const TESTIMONIAL_STATUS_TRANSITIONS: Record<TestimonialStatus, readonly TestimonialStatus[]> = {
  PENDING: ['PUBLISHED', 'REJECTED'],
  PUBLISHED: ['PENDING', 'REJECTED'],
  REJECTED: ['PENDING', 'PUBLISHED'],
};
