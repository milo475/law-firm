import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  PostStatus,
  Role,
  slugify,
  type CreatePostInput,
  type Paginated,
  type PostManageQueryInput,
  type PostQueryInput,
  type Prisma,
  type UpdatePostInput,
} from '@law-firm/shared';
import type { RequestUser } from '../common/types/request-user';
import { paginate, skipTake } from '../common/utils/pagination';
import { PUBLIC_USER_SELECT } from '../common/utils/safe-user';
import { PrismaService } from '../prisma/prisma.service';

const POST_LIST_SELECT = {
  id: true,
  title: true,
  slug: true,
  excerpt: true,
  coverImageUrl: true,
  category: true,
  status: true,
  publishedAt: true,
  viewCount: true,
  createdAt: true,
  updatedAt: true,
  author: { select: PUBLIC_USER_SELECT },
} satisfies Prisma.PostSelect;

@Injectable()
export class PostsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Public ────────────────────────────────────────────────────────────────

  /** Public listing: PUBLISHED only, newest first, optional category/search filter. */
  async findPublished(query: PostQueryInput): Promise<Paginated<unknown>> {
    const where: Prisma.PostWhereInput = {
      status: PostStatus.PUBLISHED,
      publishedAt: { lte: new Date() },
      ...(query.category ? { category: query.category } : {}),
      ...(query.search ? this.searchClause(query.search) : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        select: POST_LIST_SELECT,
        orderBy: { publishedAt: 'desc' },
        ...skipTake(query.page, query.limit),
      }),
      this.prisma.post.count({ where }),
    ]);
    return paginate(items, total, query.page, query.limit);
  }

  /** Public detail by slug; increments viewCount. */
  async findPublishedBySlug(slug: string) {
    const post = await this.prisma.post.findFirst({
      where: { slug, status: PostStatus.PUBLISHED, publishedAt: { lte: new Date() } },
      include: { author: { select: PUBLIC_USER_SELECT } },
    });
    if (!post) throw new NotFoundException('Нийтлэл олдсонгүй');

    // Fire-and-forget counter; the response does not wait on it.
    void this.prisma.post
      .update({ where: { id: post.id }, data: { viewCount: { increment: 1 } } })
      .catch(() => undefined);

    return { ...post, viewCount: post.viewCount + 1 };
  }

  // ─── Management (ADMIN / LAWYER) ───────────────────────────────────────────

  async findForManagement(query: PostManageQueryInput, user: RequestUser): Promise<Paginated<unknown>> {
    const where: Prisma.PostWhereInput = {
      ...(user.role === Role.LAWYER ? { authorId: user.id } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.search ? this.searchClause(query.search) : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        select: POST_LIST_SELECT,
        orderBy: { updatedAt: 'desc' },
        ...skipTake(query.page, query.limit),
      }),
      this.prisma.post.count({ where }),
    ]);
    return paginate(items, total, query.page, query.limit);
  }

  async create(input: CreatePostInput, user: RequestUser) {
    const slug = await this.uniqueSlug(input.slug ?? slugify(input.title));
    return this.prisma.post.create({
      data: {
        title: input.title,
        slug,
        excerpt: input.excerpt,
        content: input.content,
        coverImageUrl: input.coverImageUrl ?? null,
        category: input.category,
        status: input.status,
        publishedAt: this.resolvePublishedAt(input.status, input.publishedAt ?? null),
        authorId: user.id,
      },
      include: { author: { select: PUBLIC_USER_SELECT } },
    });
  }

  async update(id: string, input: UpdatePostInput, user: RequestUser) {
    const existing = await this.findOwnedOrFail(id, user);

    const nextStatus = input.status ?? existing.status;
    const data: Prisma.PostUpdateInput = {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.excerpt !== undefined ? { excerpt: input.excerpt } : {}),
      ...(input.content !== undefined ? { content: input.content } : {}),
      ...(input.coverImageUrl !== undefined ? { coverImageUrl: input.coverImageUrl } : {}),
      ...(input.category !== undefined ? { category: input.category } : {}),
      status: nextStatus,
      publishedAt: this.resolvePublishedAt(nextStatus, input.publishedAt ?? existing.publishedAt),
    };
    if (input.slug && input.slug !== existing.slug) {
      data.slug = await this.uniqueSlug(input.slug);
    }

    return this.prisma.post.update({
      where: { id },
      data,
      include: { author: { select: PUBLIC_USER_SELECT } },
    });
  }

  /** Full post (any status) for the editor; LAWYER only their own. */
  async findForManagementById(id: string, user: RequestUser) {
    await this.findOwnedOrFail(id, user);
    return this.prisma.post.findUnique({ where: { id }, include: { author: { select: PUBLIC_USER_SELECT } } });
  }

  async remove(id: string, user: RequestUser): Promise<void> {
    await this.findOwnedOrFail(id, user);
    await this.prisma.post.delete({ where: { id } });
  }

  // ─── helpers ───────────────────────────────────────────────────────────────

  private async findOwnedOrFail(id: string, user: RequestUser) {
    const post = await this.prisma.post.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('Нийтлэл олдсонгүй');
    if (user.role !== Role.ADMIN && post.authorId !== user.id) {
      throw new ForbiddenException('Та зөвхөн өөрийн нийтлэлийг засах боломжтой');
    }
    return post;
  }

  private searchClause(search: string): Prisma.PostWhereInput {
    return {
      OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { excerpt: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ],
    };
  }

  private resolvePublishedAt(status: PostStatus, current: Date | null): Date | null {
    if (status === PostStatus.PUBLISHED) return current ?? new Date();
    return current;
  }

  private async uniqueSlug(base: string): Promise<string> {
    const clean = slugify(base) || 'post';
    const taken = await this.prisma.post.findMany({
      where: { OR: [{ slug: clean }, { slug: { startsWith: `${clean}-` } }] },
      select: { slug: true },
    });
    if (taken.length === 0) return clean;
    const used = new Set(taken.map((row) => row.slug));
    for (let i = 2; i < 1000; i += 1) {
      const candidate = `${clean}-${i}`;
      if (!used.has(candidate)) return candidate;
    }
    throw new ConflictException('Slug үүсгэх боломжгүй байна');
  }
}
