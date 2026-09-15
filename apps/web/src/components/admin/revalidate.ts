/** Asks the web app to refresh /news (and the given article slugs) after a post changes. Best effort. */
export async function revalidateNews(slugs: (string | null | undefined)[]): Promise<void> {
  try {
    await fetch('/api/revalidate', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slugs: slugs.filter(Boolean) }),
    });
  } catch {
    // The ISR window (60 s) still refreshes the page if this fails.
  }
}
