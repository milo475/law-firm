import Link from 'next/link';
import { Logo } from '@/components/ui/logo';

/** Centered auth surface shared by login / register / forgot-password. */
export function AuthCard({ title, description, children, footer }: { title: string; description?: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <main className="flex flex-1 items-center justify-center bg-bg-page px-4 py-12">
      <div className="flex w-full max-w-[440px] flex-col gap-6">
        <div className="flex justify-center"><Logo /></div>
        <div className="flex flex-col gap-6 rounded-lg border border-border-default bg-bg-surface p-6 shadow-menu md:p-8">
          <div className="flex flex-col gap-2">
            <p className="text-overline text-text-accent">Харилцагчийн портал</p>
            <h1 className="text-h3">{title}</h1>
            {description && <p className="text-body-sm text-text-secondary">{description}</p>}
          </div>
          {children}
        </div>
        {footer && <p className="text-center text-body-sm text-text-secondary">{footer}</p>}
        <p className="text-center text-caption text-text-muted">
          <Link href="/" className="focus-ring rounded-sm hover:text-text-brand">← Нийтийн сайт руу буцах</Link>
        </p>
      </div>
    </main>
  );
}
