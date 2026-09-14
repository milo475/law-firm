'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { SearchIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';

export function NewsSearch({ category, initial }: { category: string; initial: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initial);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const qs = new URLSearchParams();
    if (category) qs.set('category', category);
    if (value.trim()) qs.set('search', value.trim());
    const s = qs.toString();
    router.push(s ? `/news?${s}` : '/news');
  }

  return (
    <form role="search" onSubmit={onSubmit} className="flex gap-2">
      <label className="relative flex-1 md:w-[280px]">
        <span className="sr-only">Нийтлэл хайх</span>
        <SearchIcon size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          type="search"
          name="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Хайх…"
          className="h-11 w-full rounded-md border border-border-default bg-bg-surface pl-11 pr-4 text-body-sm text-text-primary outline-none placeholder:text-text-muted focus:border-2 focus:border-border-focus focus:shadow-focus-ring"
        />
      </label>
      <Button type="submit" size="sm">Хайх</Button>
    </form>
  );
}
