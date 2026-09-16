// Public legal page linked from the footer: what the firm and the client portal do with personal data.
import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { loadFirmSettings } from '@/lib/firm';
import { formatPhone, phoneHref } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Нууцлалын бодлого',
  description: 'Тулгуур Хуулийн Фирм харилцагчийн хувийн мэдээллийг хэрхэн цуглуулж, ашиглаж, хамгаалдаг тухай.',
};

const UPDATED = '2026 оны 9 дүгээр сарын 16';

const SECTIONS = [
  {
    title: '1. Бид ямар мэдээлэл цуглуулдаг вэ',
    items: [
      'Таны өгсөн мэдээлэл: овог нэр, утас, и-мэйл, хэргийн тухай тайлбар, илгээсэн баримт бичиг.',
      'Гэрээний гүйцэтгэлээс үүсэх мэдээлэл: хэргийн явц, уулзалт, шүүх хурлын тэмдэглэл, нэхэмжлэх, төлбөрийн тэмдэглэл.',
      'Порталын техникийн мэдээлэл: нэвтэрсэн огноо, төхөөрөмжийн товч мэдээлэл, үйлдлийн аудитын бүртгэл. Бид зар сурталчилгааны хяналтын cookie ашигладаггүй.',
    ],
  },
  {
    title: '2. Юунд ашигладаг вэ',
    items: [
      'Эрх зүйн туслалцаа үзүүлэх, хэргийг хөтлөх, шүүх болон бусад байгууллагад төлөөлөх.',
      'Харилцагчийн порталаар хэргийн явц, баримт, нэхэмжлэхийг харуулах, мэдэгдэл илгээх.',
      'Хууль, шүүхийн шийдвэрээр шаардсан үүргээ биелүүлэх, мөнгө угаахтай тэмцэх зэрэг шалгалтыг хийх.',
      'Таны мэдээллийг зар сурталчилгаанд ашиглах, гуравдагч этгээдэд худалдахгүй.',
    ],
  },
  {
    title: '3. Хэнд задруулж болох вэ',
    items: [
      'Хэргийг хариуцсан өмгөөлөгч, багийн гишүүд болон тэдгээрийг дэмжих ажилтнууд.',
      'Таны бичгээр зөвшөөрснөөр эсвэл хууль шаардсан тохиолдолд шүүх, прокурор, төрийн эрх бүхий байгууллага.',
      'Системийг ажиллуулахад зайлшгүй үйлчилгээ үзүүлэгч (сервер, и-мэйл). Тэд зөвхөн даалгасан ажлын хүрээнд боловсруулах бөгөөд нууцлалын гэрээгээр хүлээгдэнэ.',
    ],
  },
  {
    title: '4. Хадгалалт ба хамгаалалт',
    items: [
      'Баримтыг шифрлэсэн сувгаар дамжуулж, хандах эрхийг үүргийн дагуу хязгаарладаг. Портал руу нэвтрэх бүрд сесс шинэчлэгддэг.',
      'Хэргийн материалыг гэрээ дуусснаас хойш хуульд заасан хугацаанд (ерөнхийдөө 10 жил) архивлаж, дараа нь устгана.',
      'Аюулгүй байдлын зөрчил илэрвэл нөлөөлөлд өртсөн харилцагчид болон эрх бүхий байгууллагад нэн даруй мэдэгдэнэ.',
    ],
  },
  {
    title: '5. Таны эрх',
    items: [
      'Өөрийн мэдээлэлтэй танилцах, хуулбар авах.',
      'Буруу, дутуу мэдээллийг засуулах, шинэчлүүлэх (порталын «Профайл» хэсгээс шууд).',
      'Хууль зөвшөөрөх хүрээнд устгуулах, боловсруулалтыг хязгаарлуулах.',
      'Мэдэгдлийн тохиргоог өөрчлөх, маркетингийн мэдээлэл авахаас татгалзах.',
    ],
  },
];

export default async function PrivacyPage() {
  const firm = await loadFirmSettings();
  return (
    <>
      <PageHeader
        title="Нууцлалын бодлого"
        description="Бид таны хувийн мэдээллийг эрх зүйн туслалцаа үзүүлэх зорилгоор л ашиглаж, хуулийн дагуу хамгаална."
        crumbs={[{ label: 'Нүүр', href: '/' }, { label: 'Нууцлалын бодлого' }]}
      />
      <section className="bg-bg-surface">
        <div className="mx-auto flex max-w-[840px] flex-col gap-8 px-5 py-14 md:px-6 md:py-20">
          <p className="text-body-sm text-text-muted">Сүүлд шинэчилсэн: {UPDATED}</p>
          {SECTIONS.map((section) => (
            <div key={section.title} className="flex flex-col gap-3">
              <h2 className="text-h4 text-text-primary md:text-h3">{section.title}</h2>
              <ul className="flex flex-col gap-2">
                {section.items.map((item) => (
                  <li key={item} className="flex gap-2.5 text-body text-text-secondary">
                    <span aria-hidden className="mt-2.5 size-1.5 shrink-0 rounded-full bg-text-accent" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="flex flex-col gap-3 rounded-lg bg-bg-page p-6">
            <h2 className="text-h4 text-text-primary">6. Холбоо барих</h2>
            <p className="text-body text-text-secondary">
              Мэдээлэлтэй холбоотой хүсэлт, гомдлоо{' '}
              <a href={`mailto:${firm.email}`} className="focus-ring rounded-sm text-text-accent hover:underline">{firm.email}</a> хаягаар эсвэл{' '}
              <a href={phoneHref(firm.phone)} className="focus-ring rounded-sm text-text-accent hover:underline">{formatPhone(firm.phone)}</a> дугаараар илгээнэ үү.
              Хаяг: {firm.address}.
            </p>
            <p className="text-body-sm text-text-muted">
              Үйлчилгээний нөхцөлтэй{' '}
              <Link href="/terms" className="focus-ring rounded-sm text-text-accent hover:underline">энд</Link> танилцана уу.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
