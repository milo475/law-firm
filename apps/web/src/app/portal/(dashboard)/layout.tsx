import { Sidebar } from '@/components/portal/sidebar';
import { UserProvider } from '@/components/portal/user-context';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider>
      <div className="flex min-h-screen flex-col md:flex-row">
        <Sidebar />
        <main className="flex-1 bg-brand-50/40 px-4 py-8 md:px-10">{children}</main>
      </div>
    </UserProvider>
  );
}
