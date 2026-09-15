// Figma: 01 Public Site / Public / 09 FAQ — "Categories" sidebar (Desktop 21:876) + chips (Mobile 26:1463)
'use client';

import { useEffect, useState } from 'react';
import type { FaqCategory } from '@/content/faq';

/**
 * Category navigation: anchor links to each question group with a scroll-spy
 * that highlights the group currently in view. Desktop renders the sidebar
 * list, mobile renders the chip row — both share the same active state.
 */
export function FaqNav({ categories }: { categories: FaqCategory[] }) {
  const [active, setActive] = useState(categories[0]?.id);

  useEffect(() => {
    const sections = categories
      .map((c) => document.getElementById(c.id))
      .filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-120px 0px -60% 0px', threshold: 0 },
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [categories]);

  return (
    <nav aria-label="Асуултын ангилал">
      {/* Desktop — 300px sidebar, bg-page panel, 44px rows; active row is a white bordered card */}
      <ul className="hidden w-[300px] shrink-0 flex-col gap-2 rounded-lg bg-bg-page p-4 lg:flex">
        {categories.map((c) => {
          const isActive = c.id === active;
          return (
            <li key={c.id}>
              <a
                href={`#${c.id}`}
                aria-current={isActive ? 'true' : undefined}
                onClick={() => setActive(c.id)}
                className={
                  isActive
                    ? 'focus-ring flex h-11 items-center rounded-md border border-border-default bg-bg-surface px-4 text-body-sm-medium text-text-brand'
                    : 'focus-ring flex h-11 items-center rounded-md px-4 text-body-sm-medium text-text-secondary transition-colors hover:text-text-brand'
                }
              >
                {c.label}
              </a>
            </li>
          );
        })}
      </ul>

      {/* Mobile — wrapping 44px pill chips; active chip is brand-primary filled */}
      <ul className="flex flex-wrap gap-2.5 lg:hidden">
        {categories.map((c) => {
          const isActive = c.id === active;
          return (
            <li key={c.id}>
              <a
                href={`#${c.id}`}
                aria-current={isActive ? 'true' : undefined}
                onClick={() => setActive(c.id)}
                className={
                  isActive
                    ? 'focus-ring inline-flex h-11 items-center rounded-full border border-brand-primary bg-brand-primary px-4 text-body-sm-medium text-text-on-inverse'
                    : 'focus-ring inline-flex h-11 items-center rounded-full border border-border-default bg-bg-surface px-4 text-body-sm-medium text-text-secondary transition-colors hover:text-text-brand'
                }
              >
                {c.shortLabel}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
