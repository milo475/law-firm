import { notFound } from 'next/navigation';

/**
 * Unknown paths land here (the middleware gives every request a locale), so the 404 renders with
 * the site chrome in app/[locale]/not-found.tsx instead of Next's bare fallback.
 */
export default function CatchAllPage() {
  notFound();
}
