// Figma: 01 Public Site / Public / 07 News — "Search" field (20:701 desktop 320×48, 25:1532 mobile full width)
'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { SearchIcon } from '@/components/icons';
import { buildNewsHref } from './news-utils';

export function NewsSearch({ category, initial }: { category: string; initial: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initial);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push(buildNewsHref({ category, search: value.trim() }));
  }

  return (
    <form role="search" onSubmit={onSubmit} className="w-full md:w-[320px]">
      <label className="relative block">
        <span className="sr-only">Нийтлэл хайх</span>
        <SearchIcon size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          type="search"
          name="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Нийтлэл хайх"
          enterKeyHint="search"
          className="focus-ring h-12 w-full rounded-md border border-border-default bg-bg-surface pl-[42px] pr-4 text-body text-text-primary placeholder:text-text-muted focus:border-border-focus"
        />
      </label>
      <button type="submit" className="sr-only">Хайх</button>
    </form>
  );
}
