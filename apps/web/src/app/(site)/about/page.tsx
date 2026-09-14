import type { Metadata } from 'next';
import { PageHeader } from '@/components/ui/page-header';
import { Placeholder } from '@/components/ui/placeholder';

export const metadata: Metadata = { title: 'Бидний тухай' };

export default function AboutPage() {
  return (
    <>
      <PageHeader overline="Бидний тухай" title="Хуулийн фирмийн танилцуулга" description="Бид 2014 оноос хойш иргэд, аж ахуйн нэгжид хууль зүйн үйлчилгээ үзүүлж байна." />
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-12">
        <section className="grid gap-8 md:grid-cols-2">
          <div>
            <h2 className="text-2xl">Эрхэм зорилго</h2>
            <p className="mt-3 text-slate-600">
              Хууль зүйн асуудлыг ойлгомжтой, ил тод, үр дүнтэй шийдвэрлэж, харилцагч бүрийн эрх ашгийг дээд зэргээр
              хамгаалах.
            </p>
          </div>
          <div>
            <h2 className="text-2xl">Үнэт зүйлс</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-slate-600">
              <li>Нууцлал ба итгэлцэл</li>
              <li>Мэргэжлийн ёс зүй</li>
              <li>Ил тод үнэ, тодорхой хугацаа</li>
            </ul>
          </div>
        </section>
        <Placeholder label="Багийн түүх, оффисын зураг, түншүүд" />
      </div>
    </>
  );
}
