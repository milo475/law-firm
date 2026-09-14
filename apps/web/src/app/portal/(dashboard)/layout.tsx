import { PortalShell } from '@/components/portal/portal-shell';
import { UserProvider } from '@/components/portal/user-context';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider>
      <PortalShell>{children}</PortalShell>
    </UserProvider>
  );
}
