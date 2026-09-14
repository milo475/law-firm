import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Footer } from '@/components/ui/footer';
import { NavHeader } from '@/components/ui/nav-header';

export default function NotFound() {
  return (
    <>
      <NavHeader />
      <main className="flex flex-1 items-center justify-center bg-bg-page px-4 py-24">
        <div className="flex max-w-[560px] flex-col items-center gap-5 text-center">
          <span className="flex size-20 items-center justify-center rounded-xl bg-bg-accent-soft font-serif text-h2 text-text-accent" aria-hidden>404</span>
          <p className="text-overline text-text-accent">Хуудас олдсонгүй</p>
          <h1 className="text-h2">Таны хайсан хуудас байхгүй байна</h1>
          <p className="text-body-lg text-text-secondary">Холбоос хуучирсан эсвэл хуудас шилжсэн байж болзошгүй. Нүүр хуудас руу буцах эсвэл бидэнтэй холбогдоно уу.</p>
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            <Button asChild size="md"><Link href="/">Нүүр хуудас</Link></Button>
            <Button asChild variant="secondary" size="md"><Link href="/contact">Холбоо барих</Link></Button>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
