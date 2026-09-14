import { z } from 'zod';
import { PostCategory, PostStatus } from '../generated/prisma/enums.js';
import { DateInputSchema, PaginationSchema } from './common.js';

export const PostCategorySchema = z.enum(PostCategory, { message: 'Ангилал буруу байна' });
export const PostStatusSchema = z.enum(PostStatus, { message: 'Төлөв буруу байна' });

export const SlugSchema = z
  .string()
  .trim()
  .min(3, 'Slug хамгийн багадаа 3 тэмдэгт байна')
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug зөвхөн жижиг латин үсэг, тоо, зураас агуулна');

export const CreatePostSchema = z.object({
  title: z.string().trim().min(5, 'Гарчиг хамгийн багадаа 5 тэмдэгт байна').max(200),
  slug: SlugSchema.optional(),
  excerpt: z.string().trim().min(10, 'Товч агуулга хэт богино байна').max(500),
  content: z.string().trim().min(20, 'Агуулга хэт богино байна'),
  coverImageUrl: z.url({ message: 'Зургийн холбоос буруу байна' }).nullable().optional(),
  category: PostCategorySchema,
  status: PostStatusSchema.default('DRAFT'),
  publishedAt: DateInputSchema.optional(),
});
export type CreatePostInput = z.infer<typeof CreatePostSchema>;

export const UpdatePostSchema = CreatePostSchema.partial();
export type UpdatePostInput = z.infer<typeof UpdatePostSchema>;

/** Public listing query: only PUBLISHED posts are ever returned. */
export const PostQuerySchema = PaginationSchema.extend({
  category: PostCategorySchema.optional(),
  search: z.string().trim().max(100).optional(),
});
export type PostQueryInput = z.infer<typeof PostQuerySchema>;

/** Admin/lawyer management listing — may include drafts. */
export const PostManageQuerySchema = PostQuerySchema.extend({
  status: PostStatusSchema.optional(),
});
export type PostManageQueryInput = z.infer<typeof PostManageQuerySchema>;
