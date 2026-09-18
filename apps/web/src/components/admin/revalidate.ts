async function revalidate(body: Record<string, unknown>): Promise<void> {
  try {
    await fetch('/api/revalidate', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    // The ISR window (60 s) still refreshes the page if this fails.
  }
}

/** Asks the web app to refresh /news (and the given article slugs) after a post changes. Best effort. */
export async function revalidateNews(slugs: (string | null | undefined)[]): Promise<void> {
  await revalidate({ slugs: slugs.filter(Boolean) });
}

/** Refreshes the home page, /reviews and the service pages after a testimonial changes. Best effort. */
export async function revalidateTestimonials(): Promise<void> {
  await revalidate({ paths: ['/reviews', '/services'] });
}
