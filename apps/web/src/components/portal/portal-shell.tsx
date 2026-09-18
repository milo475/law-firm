// Figma: 02 Client Portal / Portal / 03 Dashboard / Desktop (29:98) + Mobile (35:1017) — shell: Portal sidebar (27:29) + Nav header (Type=Portal) + Bottom tab bar (23:41)
'use client';

import { useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { BellIcon, CasesIcon, DocumentsIcon, HomeIcon, InboxIcon, InvoicesIcon, LogoutIcon, MessagesIcon, ProfileIcon, TabCasesIcon, TabDocumentsIcon, TabHomeIcon, TabMessagesIcon, TabProfileIcon } from '@/components/icons';
import { BottomTabBar } from '@/components/ui/bottom-tab-bar';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { PortalHeader } from '@/components/ui/portal-header';
import { Sidebar } from '@/components/ui/sidebar';
import { useUnreadNotificationCount } from '@/lib/notifications';
import { useDocumentRequestSummary } from '@/lib/document-requests';
import { useMessageUnreadSummary } from '@/lib/messages';
import { useUser } from './user-context';

// Header titles per route (Figma: "Нүүр", "Хэргүүд", …); `back` renders the mobile back arrow.
const TITLES: { match: (p: string) => boolean; key: string; back?: string }[] = [
  { match: (p) => p === '/portal', key: 'home' },
  { match: (p) => /^\/portal\/cases\/[^/]+$/.test(p), key: 'caseDetail', back: '/portal/cases' },
  { match: (p) => p.startsWith('/portal/cases'), key: 'cases' },
  { match: (p) => p === '/portal/requests/new', key: 'newRequest', back: '/portal/requests' },
  { match: (p) => p.startsWith('/portal/requests'), key: 'requests' },
  { match: (p) => p.startsWith('/portal/documents'), key: 'documents' },
  { match: (p) => /^\/portal\/invoices\/[^/]+$/.test(p), key: 'invoice', back: '/portal/invoices' },
  { match: (p) => p.startsWith('/portal/invoices'), key: 'invoices' },
  { match: (p) => p.startsWith('/portal/messages'), key: 'messages' },
  { match: (p) => p.startsWith('/portal/notifications'), key: 'notifications' },
  { match: (p) => p.startsWith('/portal/profile'), key: 'profile' },
];

export function PortalShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations('portal');
  const tEnums = useTranslations('enums.role');
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useUser();
  const unreadNotifications = useUnreadNotificationCount();
  const unread = unreadNotifications.data?.count ?? 0;
  const requestSummary = useDocumentRequestSummary();
  const openRequests = requestSummary.data?.total ?? 0;
  const messageSummary = useMessageUnreadSummary();
  const unreadMessages = messageSummary.data?.total ?? 0;
  const current = TITLES.find((item) => item.match(pathname)) ?? TITLES[0];
  const active = (href: string) => (href === '/portal' ? pathname === href : pathname.startsWith(href));

  return (
    <div className="flex min-h-screen bg-bg-page">
      {/* Figma: Portal sidebar — 260px navy column, stretched to the viewport */}
      <Sidebar
        className="sticky top-0 hidden h-screen md:flex"
        user={{ firstName: user.firstName, lastName: user.lastName, roleLabel: tEnums(user.role), avatarUrl: user.avatarUrl }}
        onLogout={() => void logout()}
        logoutIcon={<LogoutIcon />}
        items={[
          { href: '/portal', label: t('nav.home'), icon: <HomeIcon />, active: active('/portal') },
          { href: '/portal/cases', label: t('nav.cases'), icon: <CasesIcon />, active: active('/portal/cases'), count: openRequests, countLabel: t('pendingDocumentRequests') },
          { href: '/portal/requests', label: t('nav.requests'), icon: <InboxIcon />, active: active('/portal/requests') },
          { href: '/portal/documents', label: t('nav.documents'), icon: <DocumentsIcon />, active: active('/portal/documents') },
          { href: '/portal/invoices', label: t('nav.invoices'), icon: <InvoicesIcon />, active: active('/portal/invoices') },
          { href: '/portal/messages', label: t('nav.messages'), icon: <MessagesIcon />, active: active('/portal/messages'), count: unreadMessages, countLabel: t('unreadMessages') },
          { href: '/portal/notifications', label: t('nav.notifications'), icon: <BellIcon />, active: active('/portal/notifications'), count: unread },
          { href: '/portal/profile', label: t('nav.profile'), icon: <ProfileIcon />, active: active('/portal/profile') },
        ]}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Figma: Nav header Type=Portal — title · search "Хэрэг, баримт хайх" · bell · avatar + name (72px; mobile 64px) */}
        <PortalHeader
          title={t(`titles.${current.key}`)}
          user={user}
          unreadCount={unread}
          bellSlot={<NotificationBell area="portal" />}
          backHref={current.back ?? null}
          searchPlaceholder={t('searchPlaceholder')}
          onSearch={(q) => router.push(q.trim() ? `/portal/cases?q=${encodeURIComponent(q.trim())}` : '/portal/cases')}
        />
        {/* Figma: Main sections use 32px padding on desktop, 20px on mobile; bottom space clears the 76px tab bar */}
        <main id="main" className="flex-1 px-5 pb-28 pt-6 md:px-8 md:pb-12 md:pt-8">{children}</main>
      </div>
      <BottomTabBar
        tabs={[
          { href: '/portal', label: t('nav.home'), icon: <TabHomeIcon />, active: active('/portal') },
          { href: '/portal/cases', label: t('nav.cases'), icon: <TabCasesIcon />, active: active('/portal/cases') },
          { href: '/portal/documents', label: t('nav.documents'), icon: <TabDocumentsIcon />, active: active('/portal/documents') },
          { href: '/portal/messages', label: t('nav.messages'), icon: <TabMessagesIcon />, active: active('/portal/messages') },
          { href: '/portal/profile', label: t('nav.profile'), icon: <TabProfileIcon />, active: active('/portal/profile') },
        ]}
      />
    </div>
  );
}
