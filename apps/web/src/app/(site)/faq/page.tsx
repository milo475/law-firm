import type { Metadata } from 'next';
import { PageHeader } from '@/components/ui/page-header';

export const metadata: Metadata = { title: 'Түгээмэл асуулт' };

const FAQ = [
  { q: 'Анхны зөвлөгөө төлбөртэй юу?', a: 'Эхний 30 минутын танилцах уулзалт үнэ төлбөргүй. Дараагийн зөвлөгөө хэргийн төрлөөс хамааран тогтоогдоно.' },
  { q: 'Хэргийн явцаа хэрхэн хянах вэ?', a: 'Харилцагчийн порталд нэвтэрснээр хэргийн явц, баримт бичиг, нэхэмжлэх, мэдэгдлээ бодит цагийн горимд харна.' },
  { q: 'Баримт бичгээ хэрхэн илгээх вэ?', a: 'Портал дээрх хэргийн хуудаснаас баримт хавсаргах боломжтой. PDF, Word, зураг файлыг дэмжинэ.' },
  { q: 'Нууцлалыг хэрхэн хангадаг вэ?', a: 'Хуульч-үйлчлүүлэгчийн нууцлалын зарчмыг чанд баримталж, бүх мэдээллийг шифрлэн хадгална.' },
];

export default function FaqPage() {
  return (
    <>
      <PageHeader eyebrow="Тусламж" title="Түгээмэл асуулт, хариулт" />
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-12">
        {FAQ.map((item) => (
          <details key={item.q} className="group rounded-lg border border-brand-100 p-5">
            <summary className="cursor-pointer font-medium text-brand-900">{item.q}</summary>
            <p className="mt-3 text-sm text-slate-600">{item.a}</p>
          </details>
        ))}
      </div>
    </>
  );
}
