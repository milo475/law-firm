import type { Metadata } from 'next';
import { PageHeader } from '@/components/ui/page-header';

export const metadata: Metadata = { title: 'Үйлчилгээ' };

const SERVICES = [
  { title: 'Иргэний эрх зүй', items: ['Гэрээний маргаан', 'Хохирол нөхөн төлүүлэх', 'Өв залгамжлал', 'Үл хөдлөх хөрөнгийн гэрээ'] },
  { title: 'Бизнесийн эрх зүй', items: ['Компани байгуулах, өөрчлөн байгуулах', 'Хувьцаа эзэмшигчдийн гэрээ', 'Хөрөнгө оруулалтын зөвлөгөө', 'Гэрээний хяналт (due diligence)'] },
  { title: 'Гэр бүлийн эрх зүй', items: ['Гэрлэлт цуцлуулах', 'Хүүхдийн асрамж, тэтгэмж', 'Эд хөрөнгө хуваах', 'Үрчлэлт'] },
  { title: 'Хөдөлмөрийн эрх зүй', items: ['Ажлаас халагдах маргаан', 'Цалин, олговор нэхэмжлэх', 'Хөдөлмөрийн гэрээ, дотоод журам боловсруулах'] },
  { title: 'Эрүүгийн эрх зүй', items: ['Мөрдөн байцаалтын шатанд өмгөөлөл', 'Шүүхийн өмгөөлөл', 'Хохирогчийн төлөөлөл'] },
  { title: 'Бусад', items: ['Захиргааны маргаан', 'Оюуны өмч', 'Хувийн мэдээллийн хамгаалалт'] },
];

export default function ServicesPage() {
  return (
    <>
      <PageHeader overline="Үйлчилгээ" title="Хууль зүйн үйлчилгээний чиглэлүүд" description="Доорх чиглэлүүдээр зөвлөгөө өгч, төлөөлөн оролцож, баримт бичиг боловсруулна." />
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-12 md:grid-cols-2 lg:grid-cols-3">
        {SERVICES.map((service) => (
          <section key={service.title} className="rounded-lg border border-brand-100 p-6">
            <h2 className="text-xl">{service.title}</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-600">
              {service.items.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
