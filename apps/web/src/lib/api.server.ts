import { cookies } from 'next/headers';
import { apiFetch, type ApiRequestOptions } from './api';

/** Server-side variant of apiFetch that forwards the incoming request's cookies. */
export async function serverApi<T = unknown>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const store = await cookies();
  const cookie = store
    .getAll()
    .map((c) => `${c.name}=${encodeURIComponent(c.value)}`)
    .join('; ');
  return apiFetch<T>(path, { ...options, cookie: cookie || undefined });
}
