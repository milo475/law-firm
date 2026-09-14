import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ServiceCard } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { SERVICES } from '@/content/services';

export const metadata: Metadata = { title: 'Үйлчилгээ', description: 'Иргэний, эрүүгийн, гэр бүлийн, бизнесийн, хөдөлмөрийн эрх зүй, үл хөдлөх хөрөнгийн чиглэлээр хууль зүйн үйлчилгээ.' };

export default function ServicesPage() {
  return (
    <>
      <PageHeader overline="Үйлчилгээ" title="Үйлчилгээний чиглэлүүд" description="Зургаан үндсэн чиглэлээр зөвлөгөө өгч, төлөөлөн оролцож, баримт бичиг боловсруулна." crumbs={[{ label: 'Нүүр', href: '/' }, { label: 'Үйлчилгээ' }]} />
      <section className="mx-auto max-w-[1200px] px-4 py-16 md:px-6 md:py-24">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((s) => <ServiceCard key={s.slug} title={s.title} description={s.short} href={`/services/${s.slug}`} />)}
        </div>
        <div className="mt-16 flex flex-col items-start gap-4 rounded-xl bg-bg-accent-soft p-8 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-h3">Аль чиглэлд хамаарахаа мэдэхгүй байна уу?</h2>
            <p className="mt-2 text-body text-text-secondary">Асуудлаа товч бичээд илгээхэд манай хуульч тохирох чиглэлийг санал болгоно.</p>
          </div>
          <Button asChild size="lg"><Link href="/contact">Зөвлөгөө авах</Link></Button>
        </div>
      </section>
    </>
  );
}
