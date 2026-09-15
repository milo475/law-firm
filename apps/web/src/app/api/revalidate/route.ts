import { revalidatePath } from 'next/cache';
import { NextResponse, type NextRequest } from 'next/server';
import { getApiBaseUrl } from '@/lib/api';

/**
 * On-demand revalidation after staff publish/edit/delete a post, so /news and the article
 * page do not wait for the 60 s ISR window. The caller's session is checked against the API.
 */
export async function POST(request: NextRequest) {
  const me = await fetch(`${getApiBaseUrl()}/auth/me`, {
    headers: { cookie: request.headers.get('cookie') ?? '' },
    cache: 'no-store',
  }).catch(() => null);
  if (!me?.ok) return NextResponse.json({ message: 'Нэвтрэх шаардлагатай' }, { status: 401 });

  const user = (await me.json()) as { role?: string };
  if (user.role !== 'ADMIN' && user.role !== 'LAWYER') {
    return NextResponse.json({ message: 'Энэ үйлдлийг хийх эрх танд байхгүй байна' }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as { slugs?: unknown };
  const slugs = Array.isArray(body.slugs) ? body.slugs.filter((s): s is string => typeof s === 'string' && /^[a-z0-9-]+$/.test(s)) : [];

  revalidatePath('/');
  revalidatePath('/news');
  for (const slug of slugs) revalidatePath(`/news/${slug}`);
  return NextResponse.json({ revalidated: true, slugs });
}
