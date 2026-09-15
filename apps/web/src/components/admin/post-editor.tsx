'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CreatePostSchema, SlugSchema } from '@law-firm/shared/schemas';
import { slugify } from '@law-firm/shared/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { POST_STATUS_BADGE, StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { ApiError, api } from '@/lib/api';
import type { ManagedPost, PostStatus } from '@/lib/admin';
import { CATEGORY_LABELS, formatDate } from '@/lib/format';
import { revalidateNews } from './revalidate';

// Shared CreatePostSchema; slug may be left empty (derived from the title) and the cover is a plain URL string.
const PostFormSchema = CreatePostSchema.omit({ status: true, publishedAt: true }).extend({
  slug: z.union([SlugSchema, z.literal('')]),
  coverImageUrl: z.string(),
});
type PostFormValues = z.infer<typeof PostFormSchema>;

const CATEGORY_OPTIONS = (['NEWS', 'ADVICE', 'LEGAL_UPDATE'] as const).map((value) => ({ value, label: CATEGORY_LABELS[value] }));

export function PostEditor({ post }: { post?: ManagedPost }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const coverInput = useRef<HTMLInputElement>(null);
  const [slugTouched, setSlugTouched] = useState(Boolean(post));

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<PostFormValues>({
    resolver: zodResolver(PostFormSchema),
    defaultValues: {
      title: post?.title ?? '',
      slug: post?.slug ?? '',
      excerpt: post?.excerpt ?? '',
      content: post?.content ?? '',
      category: post?.category ?? 'NEWS',
      coverImageUrl: post?.coverImageUrl ?? '',
    },
  });
  const content = watch('content');
  const coverImageUrl = watch('coverImageUrl');
  const titleField = register('title', {
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!slugTouched) setValue('slug', slugify(event.target.value), { shouldValidate: false });
    },
  });

  const uploadCover = useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append('file', file);
      return api.post<{ url: string }>('/posts/cover', form);
    },
    onSuccess: ({ url }) => {
      setValue('coverImageUrl', url, { shouldDirty: true });
      toast.success('Нүүр зураг орлоо');
    },
    onError: (error) => toast.danger('Зураг оруулж чадсангүй', error instanceof ApiError ? error.message : undefined),
  });

  const save = useMutation({
    mutationFn: ({ values, status }: { values: PostFormValues; status: PostStatus }) => {
      const payload = {
        title: values.title,
        excerpt: values.excerpt,
        content: values.content,
        category: values.category,
        coverImageUrl: values.coverImageUrl || null,
        status,
        ...(values.slug ? { slug: values.slug } : {}),
      };
      return post ? api.patch<ManagedPost>(`/posts/${post.id}`, payload) : api.post<ManagedPost>('/posts', payload);
    },
    onSuccess: async (saved) => {
      await revalidateNews([saved.slug, post?.slug]);
      const message = saved.status === 'PUBLISHED' ? 'Нийтлэл нийтлэгдлээ' : saved.status === 'ARCHIVED' ? 'Нийтлэл архивлагдлаа' : 'Ноорог хадгалагдлаа';
      toast.success(message, saved.status === 'PUBLISHED' ? 'Мэдээ хуудсанд харагдана.' : undefined);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'posts'] });
      router.push('/admin/posts');
    },
    onError: (error) => toast.danger('Нийтлэл хадгалж чадсангүй', error instanceof ApiError ? error.message : undefined),
  });

  const submit = (status: PostStatus) => handleSubmit((values) => save.mutate({ values, status }));
  const isPublished = post?.status === 'PUBLISHED';

  return (
    <form onSubmit={(e) => e.preventDefault()} noValidate className="grid gap-6 xl:grid-cols-[1fr_340px]">
      <Card className="flex flex-col gap-5 p-6 md:p-8">
        <Input label="Гарчиг" placeholder="Нийтлэлийн гарчиг" required error={errors.title?.message} {...titleField} />
        <Textarea label="Товч агуулга" rows={3} placeholder="Жагсаалт болон нийгмийн сүлжээнд харагдах 1–2 өгүүлбэр" required error={errors.excerpt?.message} {...register('excerpt')} />
        <div className="flex flex-col gap-2">
          <span className="text-label-field text-text-primary">Агуулга <span className="text-status-danger-fg" aria-hidden>*</span></span>
          <Tabs defaultValue="write">
            <TabsList>
              <TabsTrigger value="write">Засварлах</TabsTrigger>
              <TabsTrigger value="preview">Урьдчилан харах</TabsTrigger>
            </TabsList>
            <TabsContent value="write" className="pt-4">
              <Textarea
                aria-label="Агуулга (Markdown)"
                rows={18}
                className="font-mono text-body-sm"
                placeholder={'## Дэд гарчиг\n\nЭнгийн текст, **тод**, [холбоос](https://...)\n\n- жагсаалт'}
                helper="Markdown: ## гарчиг, **тод**, - жагсаалт, > ишлэл"
                error={errors.content?.message}
                {...register('content')}
              />
            </TabsContent>
            <TabsContent value="preview" className="pt-4">
              {content.trim() ? (
                <div className="prose-mn min-h-[360px] rounded-md border border-border-default bg-bg-surface p-6">
                  <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{content}</ReactMarkdown>
                </div>
              ) : (
                <p className="rounded-md border border-dashed border-border-default p-6 text-body-sm text-text-muted">Урьдчилан харах агуулга алга.</p>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </Card>

      <div className="flex flex-col gap-4">
        <Card className="flex flex-col gap-4 p-6">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-h4">Нийтлэх</h3>
            {post && <StatusBadge map={POST_STATUS_BADGE} status={post.status} />}
          </div>
          {post?.publishedAt && <p className="text-caption text-text-muted">Нийтэлсэн {formatDate(post.publishedAt, true)} · {post.viewCount} үзсэн</p>}
          <Button size="md" disabled={save.isPending || uploadCover.isPending} onClick={submit('PUBLISHED')}>{isPublished ? 'Шинэчилж нийтлэх' : 'Нийтлэх'}</Button>
          <Button variant="secondary" size="md" disabled={save.isPending || uploadCover.isPending} onClick={submit('DRAFT')}>{isPublished ? 'Ноорог болгох' : 'Ноорог хадгалах'}</Button>
          {post && post.status !== 'ARCHIVED' && <Button variant="ghost" size="md" disabled={save.isPending} onClick={submit('ARCHIVED')}>Архивлах</Button>}
          {isPublished && <Button asChild variant="ghost" size="sm"><Link href={`/news/${post!.slug}`} target="_blank">Сайтад харах ↗</Link></Button>}
        </Card>

        <Card className="flex flex-col gap-5 p-6">
          <Controller control={control} name="category" render={({ field }) => (
            <Select label="Ангилал" required options={CATEGORY_OPTIONS} value={field.value} onValueChange={field.onChange} error={errors.category?.message} />
          )} />
          <Input
            label="Slug (URL)"
            placeholder="geree-baiguulah-zovlomj"
            helper={slugTouched ? 'Жижиг латин үсэг, тоо, зураас' : 'Гарчгаас автоматаар үүснэ'}
            error={errors.slug?.message}
            {...register('slug', { onChange: () => setSlugTouched(true) })}
          />
          <div className="flex flex-col gap-2">
            <span className="text-label-field text-text-primary">Нүүр зураг</span>
            {coverImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverImageUrl} alt="Нүүр зургийн урьдчилсан харагдац" className="aspect-[16/9] w-full rounded-md border border-border-default object-cover" />
            ) : (
              <div className="flex aspect-[16/9] w-full items-center justify-center rounded-md border border-dashed border-border-default bg-bg-page text-body-sm text-text-muted">Зураг сонгоогүй</div>
            )}
            <input ref={coverInput} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label="Нүүр зураг сонгох" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadCover.mutate(f); e.target.value = ''; }} />
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={uploadCover.isPending} onClick={() => coverInput.current?.click()}>{uploadCover.isPending ? 'Оруулж байна…' : coverImageUrl ? 'Солих' : 'Зураг оруулах'}</Button>
              {coverImageUrl && <Button variant="ghost" size="sm" onClick={() => setValue('coverImageUrl', '', { shouldDirty: true })}>Хасах</Button>}
            </div>
            <p className="text-caption text-text-muted">JPG, PNG, WEBP · 5MB хүртэл</p>
          </div>
        </Card>
      </div>
    </form>
  );
}
