'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AdminPageTitle } from '@/components/admin/admin-page-title';
import { ConfirmModal } from '@/components/admin/confirm-modal';
import { revalidateNews } from '@/components/admin/revalidate';
import { PlusIcon } from '@/components/icons';
import { useUser } from '@/components/portal/user-context';
import { POST_STATUS_BADGE, StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { Select } from '@/components/ui/select';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/ui/states';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '@/components/ui/table';
import { toast } from '@/components/ui/toast';
import { ApiError, api, type Paginated } from '@/lib/api';
import type { ManagedPost } from '@/lib/admin';
import { CATEGORY_LABELS, formatDate } from '@/lib/format';
import { cn, shortName } from '@/lib/utils';

const STATUS_TABS = [
  { value: '', label: 'Бүгд' },
  { value: 'DRAFT', label: 'Ноорог' },
  { value: 'PUBLISHED', label: 'Нийтэлсэн' },
  { value: 'ARCHIVED', label: 'Архив' },
];

export default function AdminPostsPage() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('ALL');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [toDelete, setToDelete] = useState<ManagedPost | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const params = new URLSearchParams({ page: String(page), limit: '20' });
  if (status) params.set('status', status);
  if (category !== 'ALL') params.set('category', category);
  if (search) params.set('search', search);

  const posts = useQuery({
    queryKey: ['admin', 'posts', { status, category, search, page }],
    queryFn: () => api.get<Paginated<ManagedPost>>(`/posts/manage?${params.toString()}`),
    placeholderData: keepPreviousData,
  });

  const remove = useMutation({
    mutationFn: (post: ManagedPost) => api.delete(`/posts/${post.id}`),
    onSuccess: async (_d, post) => {
      await revalidateNews([post.slug]);
      toast.success('Нийтлэл устгагдлаа');
      setToDelete(null);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'posts'] });
    },
    onError: (error) => toast.danger('Устгаж чадсангүй', error instanceof ApiError ? error.message : undefined),
  });

  const data = posts.data;

  return (
    <div className="flex flex-col gap-6">
      <AdminPageTitle
        title="Нийтлэл"
        description={user.role === 'ADMIN' ? 'Сайтын мэдээ, зөвлөгөө, хуулийн шинэчлэл.' : 'Таны бичсэн нийтлэлүүд.'}
        actions={<Button asChild size="md"><Link href="/admin/posts/new"><PlusIcon size={18} />Шинэ нийтлэл</Link></Button>}
      />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div role="radiogroup" aria-label="Төлөвөөр шүүх" className="flex flex-wrap gap-2">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value || 'all'}
              type="button"
              role="radio"
              aria-checked={status === tab.value}
              onClick={() => { setStatus(tab.value); setPage(1); }}
              className={cn('focus-ring inline-flex h-11 items-center rounded-full border px-5 text-body-sm-medium transition-colors', status === tab.value ? 'border-brand-primary bg-brand-primary text-text-on-inverse' : 'border-border-default bg-bg-surface text-text-secondary hover:border-border-strong')}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:w-[560px]">
          <Input label="Хайх" type="search" placeholder="Гарчиг, агуулгаар" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
          <Select label="Ангилал" value={category} onValueChange={(v) => { setCategory(v); setPage(1); }} options={[{ value: 'ALL', label: 'Бүх ангилал' }, ...Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label }))]} />
        </div>
      </div>

      {posts.isError ? (
        <ErrorState message={posts.error instanceof ApiError ? posts.error.message : 'Нийтлэл ачаалахад алдаа гарлаа'} onRetry={() => void posts.refetch()} />
      ) : !data ? (
        <TableSkeleton rows={6} />
      ) : data.items.length === 0 ? (
        <EmptyState title="Нийтлэл алга" description="Шинэ нийтлэл бичиж эхлээрэй." action={<Button asChild size="sm"><Link href="/admin/posts/new">Шинэ нийтлэл</Link></Button>} />
      ) : (
        <>
          <div className="hidden md:block">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Гарчиг</TableHeaderCell>
                <TableHeaderCell>Ангилал</TableHeaderCell>
                <TableHeaderCell>Төлөв</TableHeaderCell>
                <TableHeaderCell>Зохиогч</TableHeaderCell>
                <TableHeaderCell>Нийтэлсэн</TableHeaderCell>
                <TableHeaderCell className="text-right">Үзсэн</TableHeaderCell>
                <TableHeaderCell className="text-right">Үйлдэл</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.items.map((post) => (
                <TableRow key={post.id} interactive>
                  <TableCell className="max-w-[360px] text-body-sm-medium text-text-primary">
                    <Link href={`/admin/posts/${post.id}/edit`} className="focus-ring line-clamp-2 rounded-sm hover:text-text-brand">{post.title}</Link>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{CATEGORY_LABELS[post.category]}</TableCell>
                  <TableCell className="whitespace-nowrap"><StatusBadge map={POST_STATUS_BADGE} status={post.status} /></TableCell>
                  <TableCell className="whitespace-nowrap">{shortName(post.author.firstName, post.author.lastName)}</TableCell>
                  <TableCell className="whitespace-nowrap">{formatDate(post.publishedAt)}</TableCell>
                  <TableCell className="text-right">{post.viewCount}</TableCell>
                  <TableCell className="py-2 text-right">
                    <div className="flex justify-end gap-1">
                      <Button asChild variant="ghost" size="sm"><Link href={`/admin/posts/${post.id}/edit`}>Засах</Link></Button>
                      {post.status === 'PUBLISHED' && <Button asChild variant="ghost" size="sm"><Link href={`/news/${post.slug}`} target="_blank" aria-label={`${post.title} — сайтад харах`}>Харах</Link></Button>}
                      <Button variant="ghost" size="sm" onClick={() => setToDelete(post)}>Устгах</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
          <ul className="grid gap-3 md:hidden">
            {data.items.map((post) => (
              <li key={post.id} className="flex flex-col gap-2 rounded-lg border border-border-default bg-bg-surface p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-caption text-text-accent">{CATEGORY_LABELS[post.category]}</span>
                  <StatusBadge map={POST_STATUS_BADGE} status={post.status} />
                </div>
                <Link href={`/admin/posts/${post.id}/edit`} className="focus-ring rounded-sm text-body-medium text-text-primary">{post.title}</Link>
                <p className="text-caption text-text-muted">{shortName(post.author.firstName, post.author.lastName)} · {formatDate(post.publishedAt)} · {post.viewCount} үзсэн</p>
                <div className="flex justify-end gap-1">
                  <Button asChild variant="ghost" size="sm"><Link href={`/admin/posts/${post.id}/edit`}>Засах</Link></Button>
                  <Button variant="ghost" size="sm" onClick={() => setToDelete(post)}>Устгах</Button>
                </div>
              </li>
            ))}
          </ul>
          <Pagination className="justify-center" page={data.page} totalPages={data.totalPages} onPageChange={setPage} />
        </>
      )}

      <ConfirmModal
        open={Boolean(toDelete)}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Нийтлэл устгах"
        description={toDelete ? `«${toDelete.title}» нийтлэлийг бүр мөсөн устгах уу? Архивлах нь сэргээх боломжтой.` : ''}
        confirmLabel="Устгах"
        variant="danger"
        pending={remove.isPending}
        onConfirm={() => toDelete && remove.mutate(toDelete)}
      />
    </div>
  );
}
