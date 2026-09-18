import { z } from 'zod';

export const MN_PHONE_REGEX = /^(\+976)?[0-9]{8}$/;

/**
 * A browser-facing image URL. `z.url()` alone accepts `javascript:` and `data:` URLs — harmless in an
 * <img src> but not in an anchor — so the scheme is pinned to http(s) where the value is stored.
 */
export const ImageUrlSchema = z
  .url({ message: 'Зургийн холбоос буруу байна' })
  .refine((value) => /^https?:\/\//i.test(value), 'Зургийн холбоос http эсвэл https байх ёстой');

export const UuidSchema = z.uuid({ message: 'ID буруу форматтай байна' });

export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1, 'Хуудасны дугаар 1-ээс бага байж болохгүй').default(1),
  limit: z.coerce.number().int().min(1).max(100, 'Нэг хуудсанд хамгийн ихдээ 100 мөр').default(20),
});
export type PaginationInput = z.infer<typeof PaginationSchema>;

export const PhoneSchema = z
  .string()
  .trim()
  .regex(MN_PHONE_REGEX, 'Утасны дугаар буруу байна (8 оронтой байх ёстой)');

export const EmailSchema = z
  .email({ message: 'И-мэйл хаяг буруу байна' })
  .trim()
  .toLowerCase()
  .max(254, 'И-мэйл хаяг хэт урт байна');

export const PasswordSchema = z
  .string()
  .min(8, 'Нууц үг хамгийн багадаа 8 тэмдэгт байна')
  .max(128, 'Нууц үг хэт урт байна')
  .regex(/[A-Za-z]/, 'Нууц үг дор хаяж нэг үсэг агуулсан байх ёстой')
  .regex(/[0-9]/, 'Нууц үг дор хаяж нэг тоо агуулсан байх ёстой');

/**
 * ISO-8601 string in → Date out. A codec (instead of z.coerce.date()) keeps the
 * schema representable as JSON Schema for Swagger while still yielding a Date.
 */
export const DateInputSchema = z.codec(
  z.iso.datetime({ offset: true, message: 'Огноо ISO-8601 форматтай байх ёстой (2026-01-31T10:00:00Z)' }),
  z.date(),
  {
    decode: (value) => new Date(value),
    encode: (date) => date.toISOString(),
  },
);

export const IdParamSchema = z.object({ id: UuidSchema });

/** Generic paginated API response shape. */
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
