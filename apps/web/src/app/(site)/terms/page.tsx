// Public legal page linked from the footer: the terms the firm and its clients work under.
import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { loadFirmSettings } from '@/lib/firm';
import { formatPhone, phoneHref } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Үйлчилгээний нөхцөл',
  description: 'Тулгуур Хуулийн Фирмийн эрх зүйн үйлчилгээ, харилцагчийн порталыг ашиглах нөхцөл.',
};

const UPDATED = '2026 оны 9 дүгээр сарын 16';

const SECTIONS = [
  {
    title: '1. Үйлчилгээний хамрах хүрээ',
    items: [
      'Эрх зүйн туслалцааны нөхцөл бүрийг тухайн хэргийн гэрээгээр тодорхойлно. Энэхүү нөхцөл нь вэб сайт, харилцагчийн порталд хамаарна.',
      'Порталаар илгээсэн хүсэлт нь өмгөөллийн гэрээ байгуулсан гэсэн үг биш. Бид хүсэлтийг хянаж, хүлээж авах эсвэл шалтгаанаа мэдэгдэж татгалзана.',
      'Өмгөөлөгч томилогдож, хэрэг нээгдсэнээр л ажил эхэлнэ.',
    ],
  },
  {
    title: '2. Порталыг ашиглах',
    items: [
      'Нэвтрэх мэдээллээ нууцалж, бусдад дамжуулахгүй байх үүрэгтэй. Сэжигтэй нэвтрэлт илэрвэл нэн даруй бидэнд мэдэгдэнэ үү.',
      'Порталд байршуулсан баримтын үнэн зөв байдлыг харилцагч хариуцна.',
      'Системийг хууль бус зорилгоор, бусдын мэдээлэлд хандах оролдлогод ашиглахыг хориглоно. Зөрчсөн тохиолдолд хандалтыг хаана.',
    ],
  },
  {
    title: '3. Төлбөр',
    items: [
      'Үйлчилгээний хөлсийг гэрээнд заасан хэлбэрээр (цагаар, ажлын багцаар эсвэл үр дүнгээр) тооцно.',
      'Нэхэмжлэхийг порталаар илгээх ба заасан хугацаанд фирмийн дансанд шилжүүлнэ. Төлбөр хийсний дараа порталаас тэмдэглэхэд бид гүйлгээг тулгаж баталгаажуулна.',
      'Хугацаа хэтэрсэн нэхэмжлэх «Хугацаа хэтэрсэн» төлөвт шилжиж, шаардлагатай бол ажлыг түр зогсоож болно.',
    ],
  },
  {
    title: '4. Нууцлал ба ашиг сонирхлын зөрчил',
    items: [
      'Харилцагчийн мэдээллийг өмгөөллийн нууцын дэглэмээр хамгаална.',
      'Шинэ хүсэлт бүрийг ашиг сонирхлын зөрчилд шалгана. Зөрчил илэрвэл ажлыг хүлээн авахаас татгалзана.',
    ],
  },
  {
    title: '5. Хариуцлагын хязгаар',
    items: [
      'Бид мэргэжлийн ур чадвар, хянамгай байдлыг баримтална. Гэхдээ шүүх, эрх бүхий байгууллагын шийдвэрийн үр дүнг урьдчилан баталгаажуулахгүй.',
      'Харилцагчийн буруу, дутуу мэдээлэл, хугацаа хожимдуулснаас үүдэх үр дагаврыг фирм хариуцахгүй.',
      'Сайт болон порталын техникийн тасалдлаас үүдэх шууд бус хохирлыг хуулиар зөвшөөрөгдөх хүрээнд хариуцахгүй.',
    ],
  },
  {
    title: '6. Гэрээ цуцлах ба маргаан',
    items: [
      'Талууд бичгээр мэдэгдэж гэрээг цуцлаж болно. Цуцлах хүртэлх ажлын хөлсийг тооцож нэхэмжилнэ.',
      'Маргааныг эн тэргүүнд хэлэлцээрээр, эс бөгөөс Монгол Улсын хууль тогтоомжийн дагуу шүүхээр шийдвэрлэнэ.',
      'Энэхүү нөхцөлд өөрчлөлт оруулбал сайт дээр нийтэлж, шинэчилсэн огноог заана.',
    ],
  },
];

export default async function TermsPage() {
  const firm = await loadFirmSettings();
  return (
    <>
      <PageHeader
        title="Үйлчилгээний нөхцөл"
        description="Вэб сайт, харилцагчийн портал болон эрх зүйн үйлчилгээг ашиглахад мөрдөгдөх нөхцөл."
        crumbs={[{ label: 'Нүүр', href: '/' }, { label: 'Үйлчилгээний нөхцөл' }]}
      />
      <section className="bg-bg-surface">
        <div className="mx-auto flex max-w-[840px] flex-col gap-8 px-5 py-14 md:px-6 md:py-20">
          <p className="text-body-sm text-text-muted">Сүүлд шинэчилсэн: {UPDATED} · {firm.name}{firm.registrationNumber ? ` · РД ${firm.registrationNumber}` : ''}</p>
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
            <h2 className="text-h4 text-text-primary">7. Холбоо барих</h2>
            <p className="text-body text-text-secondary">
              Нөхцөлтэй холбоотой асуултаа{' '}
              <a href={`mailto:${firm.email}`} className="focus-ring rounded-sm text-text-accent hover:underline">{firm.email}</a> хаягаар эсвэл{' '}
              <a href={phoneHref(firm.phone)} className="focus-ring rounded-sm text-text-accent hover:underline">{formatPhone(firm.phone)}</a> дугаараар тавина уу.
            </p>
            <p className="text-body-sm text-text-muted">
              Хувийн мэдээлэл боловсруулалтыг{' '}
              <Link href="/privacy" className="focus-ring rounded-sm text-text-accent hover:underline">нууцлалын бодлогоос</Link> уншина уу.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
