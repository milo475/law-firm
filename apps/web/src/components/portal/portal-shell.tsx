// Figma: 02 Client Portal / Portal / 03 Dashboard / Desktop (29:98) + Mobile (35:1017) — shell: Portal sidebar (27:29) + Nav header (Type=Portal) + Bottom tab bar (23:41)
'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { BellIcon, CasesIcon, DocumentsIcon, HomeIcon, InvoicesIcon, LogoutIcon, MessagesIcon, ProfileIcon, TabCasesIcon, TabDocumentsIcon, TabHomeIcon, TabMessagesIcon, TabProfileIcon } from '@/components/icons';
import { BottomTabBar } from '@/components/ui/bottom-tab-bar';
import { PortalHeader } from '@/components/ui/portal-header';
import { Sidebar } from '@/components/ui/sidebar';
import { api, type NotificationItem } from '@/lib/api';
import { ROLE_LABELS } from '@/lib/format';
import { useUser } from './user-context';

// Header titles per route (Figma: "Нүүр", "Хэргүүд", …); `back` renders the mobile back arrow.
const TITLES: { match: (p: string) => boolean; title: string; back?: string }[] = [
  { match: (p) => p === '/portal', title: 'Нүүр' },
  { match: (p) => /^\/portal\/cases\/[^/]+$/.test(p), title: 'Хэргийн дэлгэрэнгүй', back: '/portal/cases' },
  { match: (p) => p.startsWith('/portal/cases'), title: 'Хэргүүд' },
  { match: (p) => p.startsWith('/portal/documents'), title: 'Баримт' },
  { match: (p) => /^\/portal\/invoices\/[^/]+$/.test(p), title: 'Нэхэмжлэх', back: '/portal/invoices' },
  { match: (p) => p.startsWith('/portal/invoices'), title: 'Нэхэмжлэх' },
  { match: (p) => p.startsWith('/portal/messages'), title: 'Мессеж' },
  { match: (p) => p.startsWith('/portal/notifications'), title: 'Мэдэгдэл' },
  { match: (p) => p.startsWith('/portal/profile'), title: 'Профайл' },
];

export function PortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useUser();
  const notifications = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get<{ items: NotificationItem[]; unreadCount: number }>('/notifications'),
    staleTime: 60_000,
  });
  const unread = notifications.data?.unreadCount ?? 0;
  const current = TITLES.find((t) => t.match(pathname)) ?? TITLES[0];
  const active = (href: string) => (href === '/portal' ? pathname === href : pathname.startsWith(href));

  return (
    <div className="flex min-h-screen bg-bg-page">
      {/* Figma: Portal sidebar — 260px navy column, stretched to the viewport */}
      <Sidebar
        className="sticky top-0 hidden h-screen md:flex"
        user={{ firstName: user.firstName, lastName: user.lastName, roleLabel: ROLE_LABELS[user.role], avatarUrl: user.avatarUrl }}
        onLogout={() => void logout()}
        logoutIcon={<LogoutIcon />}
        items={[
          { href: '/portal', label: 'Нүүр', icon: <HomeIcon />, active: active('/portal') },
          { href: '/portal/cases', label: 'Хэргүүд', icon: <CasesIcon />, active: active('/portal/cases') },
          { href: '/portal/documents', label: 'Баримт', icon: <DocumentsIcon />, active: active('/portal/documents') },
          { href: '/portal/invoices', label: 'Нэхэмжлэх', icon: <InvoicesIcon />, active: active('/portal/invoices') },
          { href: '/portal/messages', label: 'Мессеж', icon: <MessagesIcon />, active: active('/portal/messages') },
          { href: '/portal/notifications', label: 'Мэдэгдэл', icon: <BellIcon />, active: active('/portal/notifications'), count: unread },
          { href: '/portal/profile', label: 'Профайл', icon: <ProfileIcon />, active: active('/portal/profile') },
        ]}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Figma: Nav header Type=Portal — title · search "Хэрэг, баримт хайх" · bell · avatar + name (72px; mobile 64px) */}
        <PortalHeader
          title={current.title}
          user={user}
          unreadCount={unread}
          backHref={current.back ?? null}
          onSearch={(q) => router.push(q.trim() ? `/portal/cases?q=${encodeURIComponent(q.trim())}` : '/portal/cases')}
        />
        {/* Figma: Main sections use 32px padding on desktop, 20px on mobile; bottom space clears the 76px tab bar */}
        <main id="main" className="flex-1 px-5 pb-28 pt-6 md:px-8 md:pb-12 md:pt-8">{children}</main>
      </div>
      <BottomTabBar
        tabs={[
          { href: '/portal', label: 'Нүүр', icon: <TabHomeIcon />, active: active('/portal') },
          { href: '/portal/cases', label: 'Хэргүүд', icon: <TabCasesIcon />, active: active('/portal/cases') },
          { href: '/portal/documents', label: 'Баримт', icon: <TabDocumentsIcon />, active: active('/portal/documents') },
          { href: '/portal/messages', label: 'Мессеж', icon: <TabMessagesIcon />, active: active('/portal/messages') },
          { href: '/portal/profile', label: 'Профайл', icon: <TabProfileIcon />, active: active('/portal/profile') },
        ]}
      />
    </div>
  );
}
