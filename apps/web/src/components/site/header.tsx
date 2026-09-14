'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const NAV = [
  { href: '/', label: 'Нүүр' },
  { href: '/about', label: 'Бидний тухай' },
  { href: '/services', label: 'Үйлчилгээ' },
  { href: '/lawyers', label: 'Хуульчид' },
  { href: '/news', label: 'Мэдээ' },
  { href: '/faq', label: 'Түгээмэл асуулт' },
  { href: '/contact', label: 'Холбоо барих' },
];

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-40 border-b border-brand-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="font-serif text-xl font-semibold text-brand-900">
          Хуулийн фирм
        </Link>

        <nav className="hidden items-center gap-6 md:flex" aria-label="Үндсэн цэс">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`text-sm transition-colors hover:text-brand-500 ${
                isActive(item.href) ? 'font-medium text-brand-900' : 'text-slate-600'
              }`}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/portal"
            className="rounded-md bg-brand-900 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Харилцагчийн портал
          </Link>
        </nav>

        <button
          type="button"
          className="rounded-md border border-brand-100 px-3 py-2 text-sm md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label="Цэс нээх"
        >
          Цэс
        </button>
      </div>

      {open && (
        <nav className="border-t border-brand-100 bg-white px-4 py-3 md:hidden" aria-label="Гар утасны цэс">
          <ul className="flex flex-col gap-2">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link href={item.href} onClick={() => setOpen(false)} className="block py-1.5 text-sm text-slate-700">
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/portal" onClick={() => setOpen(false)} className="block py-1.5 text-sm font-medium text-brand-900">
                Харилцагчийн портал →
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
