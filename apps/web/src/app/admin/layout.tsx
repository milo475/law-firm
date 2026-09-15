import type { Metadata } from 'next';
import { AdminShell } from '@/components/admin/admin-shell';
import { UserProvider } from '@/components/portal/user-context';

export const metadata: Metadata = { title: { default: 'Удирдлага', template: '%s | Удирдлага' }, robots: { index: false, follow: false } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider>
      <AdminShell>{children}</AdminShell>
    </UserProvider>
  );
}
