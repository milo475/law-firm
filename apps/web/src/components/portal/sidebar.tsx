'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ROLE_LABELS } from '@/lib/format';
import { useUser } from './user-context';

const NAV = [
  { href: '/portal', label: 'Хянах самбар', exact: true },
  { href: '/portal/cases', label: 'Хэргүүд' },
  { href: '/portal/documents', label: 'Баримт бичиг' },
  { href: '/portal/invoices', label: 'Нэхэмжлэх' },
  { href: '/portal/notifications', label: 'Мэдэгдэл' },
  { href: '/portal/profile', label: 'Профайл' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useUser();

  return (
    <aside className="flex w-full flex-col border-b border-brand-100 bg-brand-900 text-white md:min-h-screen md:w-64 md:border-b-0">
      <div className="px-5 py-5">
        <Link href="/" className="font-serif text-lg font-semibold">Хуулийн фирм</Link>
        <p className="mt-1 text-xs text-brand-200">Харилцагчийн портал</p>
      </div>

      <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:pb-0" aria-label="Порталын цэс">
        {NAV.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`whitespace-nowrap rounded-md px-3 py-2 text-sm transition-colors ${
                active ? 'bg-brand-700 font-medium text-white' : 'text-brand-100 hover:bg-brand-700/60'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-brand-700 px-5 py-4 text-sm">
        <p className="font-medium">{user.lastName.charAt(0)}. {user.firstName}</p>
        <p className="text-xs text-brand-200">{ROLE_LABELS[user.role]} · {user.email}</p>
        <button type="button" onClick={() => void logout()} className="mt-3 text-xs text-brand-200 underline hover:text-white">
          Гарах
        </button>
      </div>
    </aside>
  );
}
