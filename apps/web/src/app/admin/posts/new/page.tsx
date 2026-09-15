'use client';

import { AdminPageTitle } from '@/components/admin/admin-page-title';
import { PostEditor } from '@/components/admin/post-editor';
import { Breadcrumb } from '@/components/ui/breadcrumb';

export default function NewPostPage() {
  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb items={[{ label: 'Нийтлэл', href: '/admin/posts' }, { label: 'Шинэ нийтлэл' }]} />
      <AdminPageTitle title="Шинэ нийтлэл" description="Ноороглон хадгалж, бэлэн болмогц нийтэлнэ." />
      <PostEditor />
    </div>
  );
}
