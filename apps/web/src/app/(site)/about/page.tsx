import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';

export const metadata: Metadata = { title: 'Бидний тухай', description: 'Тулгуур Хуулийн Фирмийн түүх, эрхэм зорилго, үнэт зүйлс.' };

const VALUES = [
  { title: 'Итгэлцэл', text: 'Харилцагчийн нууцлал, итгэлийг бүхнээс дээгүүр тавина.' },
  { title: 'Мэргэжлийн ёс зүй', text: 'Хуульчийн ёс зүйн дүрмийг чанд мөрдөж, шударгаар ажиллана.' },
  { title: 'Ил тод байдал', text: 'Үнэ, хугацаа, эрсдэлийг эхнээс нь тодорхой тайлбарлана.' },
  { title: 'Үр дүн', text: 'Хамгийн ашигтай шийдэлд хамгийн богино замаар хүргэнэ.' },
];

const MILESTONES = [
  { year: '2009', text: 'Улаанбаатар хотод 3 хуульчтай байгуулагдав.' },
  { year: '2014', text: 'Бизнесийн эрх зүйн хэлтэс нээгдэж, 40 гаруй байгууллагад байнгын зөвлөгөө өгч эхлэв.' },
  { year: '2020', text: 'Гэр бүл, хөдөлмөрийн эрх зүйн баг өргөжиж, 1,000 дахь хэргээ шийдвэрлэв.' },
  { year: '2026', text: 'Харилцагчийн онлайн портал нэвтрүүлж, Их тойрууд шинэ оффистоо нүүв.' },
];

export default function AboutPage() {
  return (
    <>
      <PageHeader overline="Бидний тухай" title="2009 оноос хойш эрх зүйн найдвартай түнш" description="Иргэд, аж ахуйн нэгжид ойлгомжтой, ил тод, үр дүнтэй хууль зүйн үйлчилгээ үзүүлэх нь бидний эрхэм зорилго." crumbs={[{ label: 'Нүүр', href: '/' }, { label: 'Бидний тухай' }]} />

      <section className="mx-auto grid max-w-[1200px] gap-12 px-4 py-16 md:px-6 md:py-24 lg:grid-cols-2">
        <div className="flex flex-col gap-5">
          <p className="text-overline text-text-accent">Эрхэм зорилго</p>
          <h2 className="text-h3 md:text-h2">Хууль зүйн асуудлыг хүн бүрт ойлгомжтой болгох</h2>
          <p className="text-body-lg text-text-secondary">Бид хууль зүйн нарийн төвөгтэй асуудлыг энгийн үгээр тайлбарлаж, харилцагч бүр шийдвэрээ мэдээлэлтэйгээр гаргах боломжийг олгодог. 12 хуульч, 4 мэргэшсэн чиглэлээр ажилладаг.</p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="md"><Link href="/lawyers">Хуульчидтай танилцах</Link></Button>
            <Button asChild variant="secondary" size="md"><Link href="/contact">Холбоо барих</Link></Button>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {VALUES.map((v) => (
            <div key={v.title} className="flex flex-col gap-2 rounded-lg border border-border-default bg-bg-surface p-6">
              <h3 className="text-h4">{v.title}</h3>
              <p className="text-body-sm text-text-secondary">{v.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-border-default bg-bg-surface">
        <div className="mx-auto max-w-[1200px] px-4 py-16 md:px-6 md:py-24">
          <p className="text-overline text-text-accent">Түүх</p>
          <h2 className="mt-3 text-h3 md:text-h2">Бидний замнал</h2>
          <ol className="mt-10 grid gap-6 md:grid-cols-4">
            {MILESTONES.map((m) => (
              <li key={m.year} className="flex flex-col gap-3 border-t-2 border-accent-default pt-5">
                <span className="font-serif text-h3 text-text-brand">{m.year}</span>
                <p className="text-body-sm text-text-secondary">{m.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="careers" className="mx-auto max-w-[1200px] px-4 py-16 md:px-6 md:py-24">
        <div className="flex flex-col items-start gap-4 rounded-xl bg-bg-inverse p-8 text-text-on-inverse md:flex-row md:items-center md:justify-between md:p-12">
          <div className="flex flex-col gap-2">
            <p className="text-overline text-accent-default">Ажлын байр</p>
            <h2 className="text-h3 text-text-on-inverse">Манай багт нэгдэх үү?</h2>
            <p className="text-body text-text-on-inverse-muted">Анкетаа careers@tulguur.mn хаягаар илгээнэ үү.</p>
          </div>
          <Button asChild variant="secondary" size="lg" className="border-accent-default bg-transparent text-text-on-inverse hover:bg-navy-700">
            <a href="mailto:careers@tulguur.mn">Анкет илгээх</a>
          </Button>
        </div>
      </section>
    </>
  );
}
