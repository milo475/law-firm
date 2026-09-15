'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import {
  BriefcaseIcon,
  CasesIcon,
  DocumentsIcon,
  HomeIcon,
  InboxIcon,
  InvoicesIcon,
  LogoutIcon,
  ProfileIcon,
  TabCasesIcon,
  TabHomeIcon,
  TabProfileIcon,
  UsersIcon,
} from '@/components/icons';
import { useUser } from '@/components/portal/user-context';
import { BottomTabBar } from '@/components/ui/bottom-tab-bar';
import { PortalHeader } from '@/components/ui/portal-header';
import { Sidebar } from '@/components/ui/sidebar';
import { isStaff } from '@/lib/admin';
import { useDocumentRequestSummary } from '@/lib/document-requests';
import { useInvoicePaymentSummary } from '@/lib/invoices';
import { useMessageUnreadSummary } from '@/lib/messages';
import { ROLE_LABELS } from '@/lib/format';

interface NavEntry {
  href: string;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

const NAV: NavEntry[] = [
  { href: '/admin', label: 'Хянах самбар', icon: <HomeIcon /> },
  { href: '/admin/cases', label: 'Хэргүүд', icon: <CasesIcon /> },
  { href: '/admin/clients', label: 'Харилцагчид', icon: <UsersIcon /> },
  { href: '/admin/lawyers', label: 'Хуульчид', icon: <BriefcaseIcon />, adminOnly: true },
  { href: '/admin/posts', label: 'Нийтлэл', icon: <DocumentsIcon /> },
  { href: '/admin/invoices', label: 'Нэхэмжлэх', icon: <InvoicesIcon /> },
  { href: '/admin/contact', label: 'Хүсэлтүүд', icon: <InboxIcon />, adminOnly: true },
  { href: '/admin/profile', label: 'Профайл', icon: <ProfileIcon /> },
];

const TITLES: { match: (p: string) => boolean; title: string; back?: string }[] = [
  { match: (p) => p === '/admin', title: 'Хянах самбар' },
  { match: (p) => p === '/admin/cases/new', title: 'Шинэ хэрэг', back: '/admin/cases' },
  { match: (p) => /^\/admin\/cases\/[^/]+$/.test(p), title: 'Хэргийн удирдлага', back: '/admin/cases' },
  { match: (p) => p.startsWith('/admin/cases'), title: 'Хэргүүд' },
  { match: (p) => /^\/admin\/clients\/[^/]+$/.test(p), title: 'Харилцагч', back: '/admin/clients' },
  { match: (p) => p.startsWith('/admin/clients'), title: 'Харилцагчид' },
  { match: (p) => /^\/admin\/lawyers\/[^/]+$/.test(p), title: 'Хуульчийн профайл', back: '/admin/lawyers' },
  { match: (p) => p.startsWith('/admin/lawyers'), title: 'Хуульчид' },
  { match: (p) => p === '/admin/posts/new' || /^\/admin\/posts\/[^/]+\/edit$/.test(p), title: 'Нийтлэл засварлагч', back: '/admin/posts' },
  { match: (p) => p.startsWith('/admin/posts'), title: 'Нийтлэл' },
  { match: (p) => /^\/admin\/invoices\/[^/]+$/.test(p), title: 'Нэхэмжлэх', back: '/admin/invoices' },
  { match: (p) => p.startsWith('/admin/invoices'), title: 'Нэхэмжлэх' },
  { match: (p) => p.startsWith('/admin/contact'), title: 'Хүсэлтүүд' },
  { match: (p) => p.startsWith('/admin/profile'), title: 'Профайл' },
];

/** Staff-only shell: reuses the portal Sidebar / PortalHeader / BottomTabBar with the admin menu. */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useUser();
  const allowed = isStaff(user.role);
  // Submissions waiting for review, shown on the "Хэргүүд" menu item.
  const requestSummary = useDocumentRequestSummary(allowed);
  const messageSummary = useMessageUnreadSummary(allowed);
  const paymentSummary = useInvoicePaymentSummary(allowed);

  useEffect(() => {
    // Middleware already redirects clients; this covers sessions that only had the refresh marker.
    if (!allowed) router.replace('/portal');
  }, [allowed, router]);

  if (!allowed) return null;

  const isAdmin = user.role === 'ADMIN';
  const current = TITLES.find((t) => t.match(pathname)) ?? TITLES[0];
  const active = (href: string) => (href === '/admin' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`));
  // Work waiting on cases: submissions to review + unread client messages.
  const pendingOnCases = (requestSummary.data?.total ?? 0) + (messageSummary.data?.total ?? 0);
  const items = NAV.filter((item) => isAdmin || !item.adminOnly).map((item) => ({
    ...item,
    active: active(item.href),
    ...(item.href === '/admin/cases' ? { count: pendingOnCases, countLabel: 'хянах баримт, уншаагүй мессеж' } : {}),
    ...(item.href === '/admin/invoices' ? { count: paymentSummary.data?.total ?? 0, countLabel: 'баталгаажуулах төлбөр' } : {}),
  }));

  return (
    <div className="flex min-h-screen bg-bg-page">
      <Sidebar
        className="sticky top-0 hidden h-screen md:flex"
        user={{ firstName: user.firstName, lastName: user.lastName, roleLabel: ROLE_LABELS[user.role], avatarUrl: user.avatarUrl }}
        onLogout={() => void logout()}
        logoutIcon={<LogoutIcon />}
        items={items}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <PortalHeader
          title={current.title}
          user={user}
          backHref={current.back ?? null}
          notificationsHref={null}
          profileHref="/admin/profile"
          searchPlaceholder="Хэргийн дугаар, нэрээр хайх"
          onSearch={(q) => router.push(q.trim() ? `/admin/cases?search=${encodeURIComponent(q.trim())}` : '/admin/cases')}
        />
        <main id="main" className="flex-1 px-5 pb-28 pt-6 md:px-8 md:pb-12 md:pt-8">{children}</main>
      </div>
      <BottomTabBar
        tabs={[
          { href: '/admin', label: 'Самбар', icon: <TabHomeIcon />, active: active('/admin') },
          { href: '/admin/cases', label: 'Хэргүүд', icon: <TabCasesIcon />, active: active('/admin/cases') },
          { href: '/admin/clients', label: 'Харилцагч', icon: <UsersIcon size={22} />, active: active('/admin/clients') },
          { href: '/admin/invoices', label: 'Нэхэмжлэх', icon: <InvoicesIcon size={22} />, active: active('/admin/invoices') },
          { href: '/admin/profile', label: 'Профайл', icon: <TabProfileIcon />, active: active('/admin/profile') },
        ]}
      />
    </div>
  );
}
