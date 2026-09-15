import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { ApiError } from '@/lib/api';
import { serverApi } from '@/lib/api.server';
import { FIRM_SETTINGS_TAG } from '@/lib/firm';

/** POST — an ADMIN saved new firm details: drop the cached copy so server-rendered pages show them on the next request. */
export async function POST() {
  try {
    const me = await serverApi<{ role: string }>('/auth/me', { skipRefresh: true, cache: 'no-store' });
    if (me.role !== 'ADMIN') return NextResponse.json({ message: 'Зөвхөн админ шинэчилнэ' }, { status: 403 });
  } catch (error) {
    const status = error instanceof ApiError && error.status === 403 ? 403 : 401;
    return NextResponse.json({ message: 'Нэвтэрнэ үү' }, { status });
  }
  revalidateTag(FIRM_SETTINGS_TAG);
  return NextResponse.json({ revalidated: true });
}
