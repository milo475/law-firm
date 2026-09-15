// Figma: 01 Public Site / Public / 02 About / Desktop (18:173) + Mobile (24:1171)
import type { Metadata } from 'next';
import { ImagePlaceholder } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';

export const metadata: Metadata = {
  title: 'Бидний тухай',
  description: 'Тулгуур Хуулийн Фирм нь 2009 оноос хойш Монгол Улсын иргэд, аж ахуйн нэгжид эрх зүйн иж бүрэн үйлчилгээ үзүүлж байна.',
};

const VALUES = [
  { title: 'Шударга байдал', text: 'Бид харилцагчдаа хэргийн бодит боломжийг үнэн зөвөөр хэлдэг. Амлаж чадахгүй зүйлээ хэзээ ч амладаггүй.' },
  { title: 'Ил тод байдал', text: 'Төлбөрийн бүтэц, хэргийн явц, хугацааны төлөвлөгөөг эхнээс нь бичгээр тодорхойлж өгнө.' },
  { title: 'Нууцлал', text: 'Харилцагчийн мэдээллийг хуулийн дагуу чанд хамгаална. Дотоод системд хандах эрхийг хатуу зохицуулдаг.' },
  { title: 'Тасралтгүй хөгжил', text: 'Хуульч бүр жилд дор хаяж 40 цагийн мэргэжлийн сургалтад хамрагддаг.' },
];

const MILESTONES = [
  { year: '2009', title: 'Фирм үүсэв', text: 'Гурван хуульчтай, Сүхбаатар дүүрэгт анхны оффис.' },
  { year: '2013', title: 'Эрүүгийн алба', text: 'Өмгөөллийн тусгай алба байгуулж, 8 хуульч нэмэгдэв.' },
  { year: '2018', title: 'Бизнесийн практик', text: 'Компанийн эрх зүйн чиглэлээр 40 гаруй ААН-тэй гэрээ байгуулав.' },
  { year: '2022', title: 'Дижитал портал', text: 'Харилцагч хэргийн явцаа онлайнаар хянах систем нэвтрүүлэв.' },
  { year: '2026', title: 'Олон улсын сүлжээ', text: 'Азийн 14 орны хуулийн фирмүүдийн сүлжээнд элсэв.' },
];

export default function AboutPage() {
  return (
    <>
      <PageHeader
        title="Бидний тухай"
        description="Тулгуур Хуулийн Фирм нь 2009 оноос хойш Монгол Улсын иргэд, аж ахуйн нэгжид эрх зүйн иж бүрэн үйлчилгээ үзүүлж байна."
        crumbs={[{ label: 'Нүүр', href: '/' }, { label: 'Бидний тухай' }]}
      />

      {/* Story — copy (560) + image placeholder (520×420); image stacks on top on mobile */}
      <section className="bg-bg-surface">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-5 px-5 py-14 md:px-6 lg:flex-row lg:items-center lg:gap-20 lg:py-24">
          <div className="flex flex-col gap-5 lg:w-[560px] lg:shrink-0 lg:gap-6">
            <p className="text-overline text-text-accent">БИДНИЙ ТҮҮХ</p>
            <h2 className="text-h3 md:text-h2">Гурван хуульчаас эхэлсэн зам</h2>
            <p className="text-body text-text-secondary">2009 онд гурван хуульч Улаанбаатар хотод жижиг оффис түрээслэн Тулгуур Хуулийн Фирмийг үүсгэн байгуулсан. Анхны харилцагчид маань хөдөлмөрийн маргаантай иргэд байв.</p>
            <p className="text-body text-text-secondary">Өнөөдөр бид 24 хуульчтай, зургаан үндсэн чиглэлээр мэргэшсэн, жилд дунджаар 180 гаруй хэрэг хөтөлдөг фирм болон өргөжсөн. Гэхдээ анхны зарчим маань хэвээр — харилцагч бүрийн хэрэг ижил чухал.</p>
          </div>
          <ImagePlaceholder className="order-first h-[220px] rounded-lg lg:order-none lg:h-[420px] lg:flex-1" markSize={56} />
        </div>
      </section>

      {/* Mission & values — 4 cards with a gold accent bar */}
      <section className="bg-bg-page">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-5 py-14 md:px-6 lg:gap-12 lg:py-24">
          <div className="flex flex-col gap-3 lg:gap-4">
            <p className="text-overline text-text-accent">ЭРХЭМ ЗОРИЛГО БА ҮНЭТ ЗҮЙЛС</p>
            <h2 className="max-w-[860px] text-h3 md:text-h2">Эрх зүйн туслалцааг хүн бүрт ойлгомжтой, хүртээмжтэй болгох</h2>
          </div>
          <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 lg:gap-8">
            {VALUES.map((v) => (
              <li key={v.title} className="flex flex-col gap-2.5 rounded-lg border border-border-default bg-bg-surface p-5 lg:gap-3 lg:p-7">
                <span aria-hidden className="h-1 w-8 rounded-[2px] bg-accent-default lg:w-10" />
                <h3 className="text-h4">{v.title}</h3>
                <p className="text-body-sm text-text-secondary">{v.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Timeline — navy band, 5 steps in a row (desktop) / dot list (mobile) */}
      <section className="bg-bg-inverse">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-5 py-14 md:px-6 lg:gap-12 lg:py-24">
          <div className="flex flex-col gap-3 lg:gap-4">
            <p className="text-overline text-accent-default">ТҮҮХЭН ЗАМНАЛ</p>
            <h2 className="text-h3 text-text-on-inverse md:text-h2">Чухал үе шатууд</h2>
          </div>
          <ol className="flex flex-col gap-6 lg:flex-row lg:gap-0">
            {MILESTONES.map((m) => (
              <li key={m.year} className="flex gap-3.5 lg:flex-1 lg:flex-col lg:gap-2.5 lg:pr-6">
                <span aria-hidden className="mt-2 size-2.5 shrink-0 rounded-full bg-accent-default lg:mt-0 lg:size-3.5" />
                <div className="flex flex-col gap-1 lg:gap-2.5">
                  <span className="text-h4 text-accent-default lg:text-h3">{m.year}</span>
                  <p className="text-body-medium text-text-on-inverse">{m.title}</p>
                  <p className="text-body-sm text-text-on-inverse-muted">{m.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
