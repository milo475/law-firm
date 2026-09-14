import { Footer } from '@/components/ui/footer';
import { NavHeader } from '@/components/ui/nav-header';

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-bg-surface focus:px-4 focus:py-2 focus:text-body-medium focus:text-text-brand focus:shadow-menu">
        Үндсэн агуулга руу очих
      </a>
      <NavHeader />
      <main id="main" className="flex-1 bg-bg-page">{children}</main>
      <Footer />
    </>
  );
}
