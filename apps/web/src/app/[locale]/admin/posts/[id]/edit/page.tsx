'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AdminPageTitle } from '@/components/admin/admin-page-title';
import { PostEditor } from '@/components/admin/post-editor';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { CardSkeleton, ErrorState, Skeleton } from '@/components/ui/states';
import { ApiError, api } from '@/lib/api';
import type { ManagedPost } from '@/lib/admin';

export default function EditPostPage() {
  const { id } = useParams<{ id: string }>();
  const post = useQuery({ queryKey: ['admin', 'post', id], queryFn: () => api.get<ManagedPost>(`/posts/manage/${id}`), retry: false });

  if (post.isError) {
    const forbidden = post.error instanceof ApiError && post.error.status === 403;
    return (
      <div className="flex flex-col gap-4">
        <Breadcrumb items={[{ label: 'Нийтлэл', href: '/admin/posts' }, { label: forbidden ? 'Хандах эрхгүй' : 'Олдсонгүй' }]} />
        <ErrorState title={forbidden ? '403 — Та зөвхөн өөрийн нийтлэлийг засна' : '404 — Нийтлэл олдсонгүй'} message={post.error instanceof ApiError ? post.error.message : undefined} />
        <div><Button asChild variant="secondary" size="sm"><Link href="/admin/posts">Нийтлэл рүү буцах</Link></Button></div>
      </div>
    );
  }
  if (!post.data) return <div className="flex flex-col gap-6"><Skeleton className="h-4 w-48" /><CardSkeleton /></div>;

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb items={[{ label: 'Нийтлэл', href: '/admin/posts' }, { label: post.data.title }]} />
      <AdminPageTitle title="Нийтлэл засах" />
      <PostEditor key={post.data.updatedAt} post={post.data} />
    </div>
  );
}
