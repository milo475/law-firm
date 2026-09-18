// Figma: 01 Public Site / Public / 02 About / Desktop (18:173) + Mobile (24:1171)
import type { Metadata } from 'next';
import { ImagePlaceholder } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';

export const metadata: Metadata = {
  title: 'Бидний тухай',
  description: 'Strategy Law Firm — хууль зүйн мэргэжлийн туслалцаа үзүүлэгч байгууллага. Иргэн, аж ахуйн нэгжид өмгөөлөл, эрх зүйн зөвлөгөө үзүүлнэ.',
};

const VALUES = [
  { title: 'Шударга байдал', text: 'Бид харилцагчдаа хэргийн бодит боломжийг үнэн зөвөөр хэлдэг. Амлаж чадахгүй зүйлээ хэзээ ч амладаггүй.' },
  { title: 'Ил тод байдал', text: 'Төлбөрийн бүтэц, хэргийн явц, хугацааны төлөвлөгөөг эхнээс нь бичгээр тодорхойлж өгнө.' },
  { title: 'Нууцлал', text: 'Харилцагчийн мэдээллийг хуулийн дагуу чанд хамгаална. Дотоод системд хандах эрхийг хатуу зохицуулдаг.' },
  { title: 'Ойлгомжтой хэл', text: 'Эрх зүйн нөхцөл байдлыг хуулийн хэллэгээр биш, шийдвэр гаргахад хэрэгтэй хэлбэрээр тайлбарлана.' },
];

/** How an engagement runs — process, not history: nothing here is a claim about the firm's past. */
const PROCESS = [
  { step: '01', title: 'Хүсэлт хүлээн авах', text: 'Порталаар эсхүл холбоо барих хэсгээр хүсэлтээ илгээнэ. Асуудлын төрлийг тодруулна.' },
  { step: '02', title: 'Урьдчилсан үнэлгээ', text: 'Баримт бичигтэй танилцаж, эрх зүйн боломж, эрсдэлийг тайлбарлана.' },
  { step: '03', title: 'Гэрээ, төлөвлөгөө', text: 'Хийх ажил, хугацаа, төлбөрийн нөхцөлийг бичгээр тохиролцоно.' },
  { step: '04', title: 'Хэрэг хөтлөх', text: 'Байгууллага, шүүхэд төлөөлж, явцын мэдээллийг харилцагчийн порталд тогтмол оруулна.' },
];

export default function AboutPage() {
  return (
    <>
      <PageHeader
        title="Бидний тухай"
        description="Strategy Law Firm — хууль зүйн мэргэжлийн туслалцаа үзүүлэгч байгууллага."
        crumbs={[{ label: 'Нүүр', href: '/' }, { label: 'Бидний тухай' }]}
      />

      {/* Story — copy (560) + image placeholder (520×420); image stacks on top on mobile */}
      <section className="bg-bg-surface">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-5 px-5 py-14 md:px-6 lg:flex-row lg:items-center lg:gap-20 lg:py-24">
          <div className="flex flex-col gap-5 lg:w-[560px] lg:shrink-0 lg:gap-6">
            <p className="text-overline text-text-accent">БИДНИЙ ТУХАЙ</p>
            <h2 className="text-h3 md:text-h2">Эрх зүйн асуудлыг ойлгомжтой болгож, дэргэд нь зогсоно</h2>
            <p className="text-body text-text-secondary">Strategy Law Firm нь иргэн, аж ахуйн нэгжид хууль зүйн мэргэжлийн туслалцаа үзүүлдэг. Өмгөөллийн үйлчилгээ, эрх зүйн зөвлөгөө, баримт бичгийн боловсруулалт, байгууллага болон шүүхэд төлөөлөх ажлыг хариуцан гүйцэтгэнэ.</p>
            <p className="text-body text-text-secondary">Хэрэг бүрийг хүлээн авахдаа эхлээд бодит боломжийг нь үнэлж, хийж чадах зүйлээ тодорхой хэлдэг. Ажлын явцыг харилцагчийн порталаар хөтөлж, баримт бичиг, хугацаа, дараагийн алхам нь үргэлж нэг дор харагдаж байхаар зохион байгуулсан.</p>
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
            <p className="text-overline text-accent-default">ХАМТРАН АЖИЛЛАХ ЯВЦ</p>
            <h2 className="text-h3 text-text-on-inverse md:text-h2">Хэрэг хэрхэн урагшилдаг вэ</h2>
          </div>
          <ol className="flex flex-col gap-6 lg:flex-row lg:gap-0">
            {PROCESS.map((p) => (
              <li key={p.step} className="flex gap-3.5 lg:flex-1 lg:flex-col lg:gap-2.5 lg:pr-6">
                <span aria-hidden className="mt-2 size-2.5 shrink-0 rounded-full bg-accent-default lg:mt-0 lg:size-3.5" />
                <div className="flex flex-col gap-1 lg:gap-2.5">
                  <span className="text-h4 text-accent-default lg:text-h3">{p.step}</span>
                  <p className="text-body-medium text-text-on-inverse">{p.title}</p>
                  <p className="text-body-sm text-text-on-inverse-muted">{p.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
