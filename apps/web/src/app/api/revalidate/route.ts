import { revalidatePath } from 'next/cache';
import { NextResponse, type NextRequest } from 'next/server';
import { managesPosts } from '@/lib/admin';
import { getApiBaseUrl } from '@/lib/api';

/**
 * On-demand revalidation after staff publish/edit/delete a post or a testimonial, so the public
 * pages do not wait for the 60 s ISR window. The caller's session is checked against the API —
 * an editor publishes posts, so they may refresh the pages a post appears on.
 *
 * `slugs` are article slugs; `paths` are extra public routes (e.g. /reviews, /services/civil).
 */
export async function POST(request: NextRequest) {
  const me = await fetch(`${getApiBaseUrl()}/auth/me`, {
    headers: { cookie: request.headers.get('cookie') ?? '' },
    cache: 'no-store',
  }).catch(() => null);
  if (!me?.ok) return NextResponse.json({ message: 'Нэвтрэх шаардлагатай' }, { status: 401 });

  const user = (await me.json()) as { role?: string };
  if (!managesPosts(user.role)) {
    return NextResponse.json({ message: 'Энэ үйлдлийг хийх эрх танд байхгүй байна' }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as { slugs?: unknown; paths?: unknown };
  const slugs = Array.isArray(body.slugs) ? body.slugs.filter((s): s is string => typeof s === 'string' && /^[a-z0-9-]+$/.test(s)) : [];
  // Only our own public routes, never an arbitrary path from the request.
  const allowed = new Set(['/news', '/reviews', '/services', '/lawyers']);
  const paths = Array.isArray(body.paths)
    ? body.paths.filter((p): p is string => typeof p === 'string' && /^\/[a-z0-9/-]*$/.test(p) && allowed.has(`/${p.split('/')[1] ?? ''}`))
    : [];

  revalidatePath('/');
  revalidatePath('/news');
  for (const slug of slugs) revalidatePath(`/news/${slug}`);
  for (const path of paths) revalidatePath(path);
  return NextResponse.json({ revalidated: true, slugs, paths });
}
