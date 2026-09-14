import type { Metadata } from 'next';
import { PageHeader } from '@/components/ui/page-header';
import { ContactForm } from './contact-form';

export const metadata: Metadata = { title: 'Холбоо барих' };

export default function ContactPage() {
  return (
    <>
      <PageHeader overline="Холбоо барих" title="Бидэнтэй холбогдох" description="Хүсэлтээ илгээснээр манай хуульч ажлын 1 өдрийн дотор тантай холбогдоно." />
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-[1fr_320px]">
        <ContactForm />
        <aside className="space-y-4 text-sm text-slate-600">
          <div>
            <p className="font-semibold text-brand-900">Хаяг</p>
            <p>Улаанбаатар, Сүхбаатар дүүрэг, Чингисийн өргөн чөлөө</p>
          </div>
          <div>
            <p className="font-semibold text-brand-900">Утас</p>
            <p>+976 7000-0000</p>
          </div>
          <div>
            <p className="font-semibold text-brand-900">И-мэйл</p>
            <p>info@lawfirm.mn</p>
          </div>
          <div className="h-48 rounded-lg bg-brand-50" aria-label="Газрын зураг (placeholder)" />
        </aside>
      </div>
    </>
  );
}
