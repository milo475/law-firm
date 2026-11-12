import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  PostStatus,
  slugify,
  type CreatePostInput,
  type Paginated,
  type PostManageQueryInput,
  type PostQueryInput,
  type Prisma,
  type UpdatePostInput,
} from '@law-firm/shared';
import { err } from '../common/errors/app-error';
import { BYLINE_ROLE, managesEveryPost } from '../common/permissions';
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

/** The editor's view of one post: the byline plus who actually typed and last saved it. */
const POST_MANAGE_INCLUDE = {
  author: { select: PUBLIC_USER_SELECT },
  createdBy: { select: PUBLIC_USER_SELECT },
  updatedBy: { select: PUBLIC_USER_SELECT },
} satisfies Prisma.PostInclude;

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
        // `id` only breaks ties: two posts published in the same second would otherwise come back
        // in whatever order the database felt like, which repeats or drops a row across pages.
        orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
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
    if (!post) throw new NotFoundException(err('post.notFound', 'Нийтлэл олдсонгүй'));

    // Fire-and-forget counter; the response does not wait on it.
    void this.prisma.post
      .update({ where: { id: post.id }, data: { viewCount: { increment: 1 } } })
      .catch(() => undefined);

    return { ...post, viewCount: post.viewCount + 1 };
  }

  // ─── Management (ADMIN / EDITOR / LAWYER) ──────────────────────────────────

  async findForManagement(query: PostManageQueryInput, user: RequestUser): Promise<Paginated<unknown>> {
    const where: Prisma.PostWhereInput = {
      ...(managesEveryPost(user.role) ? {} : this.ownPostsClause(user.id)),
      ...(query.status ? { status: query.status } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.search ? this.searchClause(query.search) : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        select: POST_LIST_SELECT,
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
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
        authorId: await this.resolveByline(input.authorId, user),
        createdById: user.id,
        updatedById: user.id,
      },
      include: POST_MANAGE_INCLUDE,
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
    if (input.authorId !== undefined) {
      const authorId = await this.resolveByline(input.authorId, user);
      data.author = authorId ? { connect: { id: authorId } } : { disconnect: true };
    }
    data.updatedBy = { connect: { id: user.id } };

    return this.prisma.post.update({
      where: { id },
      data,
      include: POST_MANAGE_INCLUDE,
    });
  }

  /** Full post (any status) for the editor; LAWYER only their own. */
  async findForManagementById(id: string, user: RequestUser) {
    await this.findOwnedOrFail(id, user);
    return this.prisma.post.findUnique({ where: { id }, include: POST_MANAGE_INCLUDE });
  }

  /** The people a post may be signed with: the firm's active lawyers, nobody else. */
  authors() {
    return this.prisma.user.findMany({
      where: { role: BYLINE_ROLE, isActive: true },
      select: PUBLIC_USER_SELECT,
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });
  }

  async remove(id: string, user: RequestUser): Promise<void> {
    await this.findOwnedOrFail(id, user);
    await this.prisma.post.delete({ where: { id } });
  }

  // ─── helpers ───────────────────────────────────────────────────────────────

  private async findOwnedOrFail(id: string, user: RequestUser) {
    const post = await this.prisma.post.findUnique({ where: { id } });
    if (!post) throw new NotFoundException(err('post.notFound', 'Нийтлэл олдсонгүй'));
    if (!managesEveryPost(user.role) && post.authorId !== user.id && post.createdById !== user.id) {
      throw new ForbiddenException(err('post.editOwnOnly', 'Та зөвхөн өөрийн нийтлэлийг засах боломжтой'));
    }
    return post;
  }

  /** A lawyer's own posts: the ones signed with their name and the ones they typed. */
  private ownPostsClause(userId: string): Prisma.PostWhereInput {
    return { OR: [{ authorId: userId }, { createdById: userId }] };
  }

  /**
   * The byline the caller asked for. Left out entirely it falls back to the writer, but only when
   * the writer is a lawyer — an editor who says nothing publishes a post with no name under it
   * rather than their own.
   */
  private async resolveByline(authorId: string | null | undefined, user: RequestUser): Promise<string | null> {
    if (authorId === undefined) return user.role === BYLINE_ROLE ? user.id : null;
    if (authorId === null) return null;
    const author = await this.prisma.user.findUnique({ where: { id: authorId }, select: { role: true, isActive: true } });
    if (!author || !author.isActive || author.role !== BYLINE_ROLE) {
      throw new BadRequestException(err('post.authorNotLawyer', 'Зохиогчоор зөвхөн идэвхтэй хуульчийг сонгоно'));
    }
    return authorId;
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
    throw new ConflictException(err('post.slugUnavailable', 'Slug үүсгэх боломжгүй байна'));
  }
}
