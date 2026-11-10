import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ADMIN_USER, EDITOR_USER, LAWYER_USER, createPrismaMock, type PrismaMock } from '../common/testing/mocks';
import { PrismaService } from '../prisma/prisma.service';
import { PostsService } from './posts.service';

describe('PostsService', () => {
  let service: PostsService;
  let prisma: PrismaMock;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new PostsService(prisma as unknown as PrismaService);
    prisma.post.findMany.mockResolvedValue([]);
    prisma.post.count.mockResolvedValue(0);
  });

  describe('findPublished (public)', () => {
    it('only returns PUBLISHED posts whose publishedAt is in the past', async () => {
      await service.findPublished({ page: 1, limit: 20 });
      const where = prisma.post.findMany.mock.calls[0][0].where;
      expect(where.status).toBe('PUBLISHED');
      expect(where.publishedAt.lte).toBeInstanceOf(Date);
    });

    it('filters by category and searches title/excerpt/content case-insensitively', async () => {
      await service.findPublished({ page: 1, limit: 20, category: 'ADVICE', search: 'гэрээ' });
      const where = prisma.post.findMany.mock.calls[0][0].where;
      expect(where.category).toBe('ADVICE');
      expect(where.OR).toEqual([
        { title: { contains: 'гэрээ', mode: 'insensitive' } },
        { excerpt: { contains: 'гэрээ', mode: 'insensitive' } },
        { content: { contains: 'гэрээ', mode: 'insensitive' } },
      ]);
    });

    it('paginates and reports totals', async () => {
      prisma.post.count.mockResolvedValue(45);
      const result = await service.findPublished({ page: 2, limit: 20 });
      expect(prisma.post.findMany.mock.calls[0][0]).toMatchObject({ skip: 20, take: 20 });
      expect(result).toMatchObject({ total: 45, page: 2, limit: 20, totalPages: 3 });
    });
  });

  describe('findPublishedBySlug', () => {
    it('increments viewCount and returns the post', async () => {
      prisma.post.findFirst.mockResolvedValue({ id: 'p1', slug: 'abc', viewCount: 10 });
      prisma.post.update.mockResolvedValue({});

      const post = await service.findPublishedBySlug('abc');

      expect(prisma.post.findFirst.mock.calls[0][0].where).toMatchObject({ slug: 'abc', status: 'PUBLISHED' });
      expect(prisma.post.update).toHaveBeenCalledWith({ where: { id: 'p1' }, data: { viewCount: { increment: 1 } } });
      expect(post.viewCount).toBe(11);
    });

    it('drafts are invisible → 404', async () => {
      prisma.post.findFirst.mockResolvedValue(null);
      await expect(service.findPublishedBySlug('draft')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('management', () => {
    it('LAWYER management listing is limited to the posts they signed or typed', async () => {
      await service.findForManagement({ page: 1, limit: 20 }, LAWYER_USER);
      expect(prisma.post.findMany.mock.calls[0][0].where).toMatchObject({
        OR: [{ authorId: LAWYER_USER.id }, { createdById: LAWYER_USER.id }],
      });
    });

    it.each([ADMIN_USER, EDITOR_USER])('$role management listing covers every post', async (user) => {
      await service.findForManagement({ page: 1, limit: 20 }, user);
      expect(prisma.post.findMany.mock.calls[0][0].where.OR).toBeUndefined();
      expect(prisma.post.findMany.mock.calls[0][0].where.authorId).toBeUndefined();
    });

    it('generates a transliterated slug from a Mongolian title', async () => {
      prisma.post.create.mockImplementation(async ({ data }: any) => data);
      const created = await service.create(
        {
          title: 'Гэрээ байгуулахад анхаарах зүйлс',
          excerpt: 'Товч агуулга энд байна',
          content: 'Дэлгэрэнгүй агуулга энд байна, хангалттай урт.',
          category: 'ADVICE',
          status: 'PUBLISHED',
        },
        ADMIN_USER,
      );
      expect(created.slug).toBe('geree-baiguulakhad-ankhaarakh-zuils');
      expect(created.publishedAt).toBeInstanceOf(Date);
    });

    it('LAWYER cannot edit another author’s post', async () => {
      prisma.post.findUnique.mockResolvedValue({ id: 'p1', authorId: 'someone-else', status: 'DRAFT', slug: 'x', publishedAt: null });
      await expect(service.update('p1', { title: 'Шинэ гарчиг' }, LAWYER_USER)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it.each([ADMIN_USER, EDITOR_USER])('$role can edit anyone’s post', async (user) => {
      prisma.post.findUnique.mockResolvedValue({ id: 'p1', authorId: 'someone-else', status: 'DRAFT', slug: 'x', publishedAt: null });
      prisma.post.update.mockResolvedValue({ id: 'p1' });
      await expect(service.update('p1', { title: 'Шинэ гарчиг' }, user)).resolves.toEqual({ id: 'p1' });
    });

    it.each([ADMIN_USER, EDITOR_USER])('$role can delete anyone’s post', async (user) => {
      prisma.post.findUnique.mockResolvedValue({ id: 'p1', authorId: 'someone-else', createdById: 'someone-else' });
      prisma.post.delete.mockResolvedValue({});
      await expect(service.remove('p1', user)).resolves.toBeUndefined();
    });

    it('LAWYER keeps the post they typed even after the byline moved to a colleague', async () => {
      prisma.post.findUnique.mockResolvedValue({ id: 'p1', authorId: 'other-lawyer', createdById: LAWYER_USER.id, status: 'DRAFT', slug: 'x', publishedAt: null });
      prisma.post.update.mockResolvedValue({ id: 'p1' });
      await expect(service.update('p1', { title: 'Шинэ гарчиг' }, LAWYER_USER)).resolves.toEqual({ id: 'p1' });
    });
  });

  describe('byline', () => {
    const draft = {
      title: 'Гэрээ байгуулахад анхаарах зүйлс',
      excerpt: 'Товч агуулга энд байна',
      content: 'Дэлгэрэнгүй агуулга энд байна, хангалттай урт.',
      category: 'ADVICE',
      status: 'DRAFT',
    } as const;

    beforeEach(() => {
      prisma.post.create.mockImplementation(async ({ data }: any) => data);
    });

    it('a lawyer writing for themselves signs their own name', async () => {
      const created = await service.create({ ...draft }, LAWYER_USER);
      expect(created).toMatchObject({ authorId: LAWYER_USER.id, createdById: LAWYER_USER.id, updatedById: LAWYER_USER.id });
    });

    it('an editor who names nobody publishes without a byline — never their own name', async () => {
      const created = await service.create({ ...draft }, EDITOR_USER);
      expect(created).toMatchObject({ authorId: null, createdById: EDITOR_USER.id });
    });

    it('an editor can sign the post with a lawyer', async () => {
      prisma.user.findUnique.mockResolvedValue({ role: 'LAWYER', isActive: true });
      const created = await service.create({ ...draft, authorId: 'lawyer-uuid' }, EDITOR_USER);
      expect(created).toMatchObject({ authorId: 'lawyer-uuid', createdById: EDITOR_USER.id });
    });

    it.each([
      ['a client', { role: 'CLIENT', isActive: true }],
      ['another editor', { role: 'EDITOR', isActive: true }],
      ['a lawyer who has left', { role: 'LAWYER', isActive: false }],
      ['nobody at all', null],
    ])('refuses %s as the byline', async (_case, found) => {
      prisma.user.findUnique.mockResolvedValue(found);
      await expect(service.create({ ...draft, authorId: 'some-uuid' }, EDITOR_USER)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('clearing the byline on an existing post disconnects the author', async () => {
      prisma.post.findUnique.mockResolvedValue({ id: 'p1', authorId: 'lawyer-uuid', status: 'DRAFT', slug: 'x', publishedAt: null });
      prisma.post.update.mockImplementation(async ({ data }: any) => data);
      const updated = await service.update('p1', { authorId: null }, EDITOR_USER);
      expect(updated).toMatchObject({ author: { disconnect: true }, updatedBy: { connect: { id: EDITOR_USER.id } } });
    });

    it('only active lawyers are offered as authors', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      await service.authors();
      expect(prisma.user.findMany.mock.calls[0][0].where).toEqual({ role: 'LAWYER', isActive: true });
    });
  });
});
