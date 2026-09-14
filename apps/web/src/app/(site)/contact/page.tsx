import type { Metadata } from 'next';
import { CONTACT } from '@/components/ui/footer';
import { PageHeader } from '@/components/ui/page-header';
import { ContactForm } from './contact-form';

export const metadata: Metadata = { title: 'Холбоо барих', description: 'Тулгуур Хуулийн Фирмтэй холбогдох: хаяг, утас, и-мэйл, хүсэлт илгээх форм.' };

export default function ContactPage() {
  return (
    <>
      <PageHeader overline="Холбоо барих" title="Бидэнтэй холбогдох" description="Хүсэлтээ илгээснээр манай хуульч ажлын 1 өдрийн дотор тантай холбогдоно." crumbs={[{ label: 'Нүүр', href: '/' }, { label: 'Холбоо барих' }]} />
      <section className="mx-auto grid max-w-[1200px] gap-12 px-4 py-16 md:px-6 md:py-24 lg:grid-cols-[1fr_360px]">
        <div className="rounded-lg border border-border-default bg-bg-surface p-6 md:p-8">
          <h2 className="text-h3">Хүсэлт илгээх</h2>
          <p className="mt-2 text-body-sm text-text-secondary">Талбар бүрийг бөглөнө үү. Нууцлалыг чанд хадгална.</p>
          <div className="mt-8">
            <ContactForm />
          </div>
        </div>
        <aside className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 rounded-lg border border-border-default bg-bg-surface p-6">
            <Info label="Хаяг" value={CONTACT.addressLines.join(' ')} />
            <Info label="Утас" value={<a href={`tel:${CONTACT.phone.replace(/[^+\d]/g, '')}`} className="focus-ring rounded-sm text-text-brand hover:underline">{CONTACT.phone}</a>} />
            <Info label="И-мэйл" value={<a href={`mailto:${CONTACT.email}`} className="focus-ring rounded-sm text-text-brand hover:underline">{CONTACT.email}</a>} />
            <Info label="Ажлын цаг" value={CONTACT.hours} />
          </div>
          <div className="flex h-56 items-center justify-center rounded-lg border border-border-default bg-navy-100" role="img" aria-label="Оффисын байршлын газрын зураг">
            <span className="rounded-[6px] border-2 border-navy-200" style={{ width: 64, height: 64 }} aria-hidden />
          </div>
        </aside>
      </section>
    </>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-caption text-text-muted">{label}</p>
      <p className="text-body text-text-primary">{value}</p>
    </div>
  );
}
