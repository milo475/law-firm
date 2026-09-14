import Link from 'next/link';
import { Placeholder } from '@/components/ui/placeholder';
import { apiFetch, type Paginated, type PostListItem } from '@/lib/api';
import { CATEGORY_LABELS, formatDate } from '@/lib/format';

export const revalidate = 60;

async function latestPosts(): Promise<PostListItem[]> {
  try {
    const data = await apiFetch<Paginated<PostListItem>>('/posts?limit=3', { next: { revalidate: 60 } });
    return data.items;
  } catch {
    return [];
  }
}

const SERVICES = [
  { title: 'Иргэний эрх зүй', text: 'Гэрээний маргаан, хохирол нөхөн төлүүлэх, өв залгамжлал.' },
  { title: 'Бизнесийн эрх зүй', text: 'Компани байгуулах, хувьцаа эзэмшигчдийн маргаан, хөрөнгө оруулалт.' },
  { title: 'Гэр бүлийн эрх зүй', text: 'Гэрлэлт цуцлуулах, хүүхдийн асрамж, тэтгэмж, эд хөрөнгө хуваах.' },
  { title: 'Хөдөлмөрийн эрх зүй', text: 'Ажлаас халагдах, цалин, хөдөлмөрийн гэрээний маргаан.' },
];

export default async function HomePage() {
  const posts = await latestPosts();

  return (
    <>
      <section className="bg-brand-900 text-white">
        <div className="mx-auto max-w-6xl px-4 py-20 md:py-28">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent-500">Хуулийн фирм</p>
          <h1 className="mt-4 max-w-3xl text-4xl text-white md:text-5xl">
            Таны эрх ашгийг хамгаалах найдвартай түнш
          </h1>
          <p className="mt-5 max-w-2xl text-brand-100">
            Иргэн, бизнесийн эрх зүйн чиглэлээр туршлагатай хуульчдын баг. Хэргийн явцаа харилцагчийн порталаар
            хэдийд ч хянах боломжтой.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/contact" className="rounded-md bg-accent-500 px-5 py-3 text-sm font-medium text-brand-900 hover:bg-accent-600">
              Зөвлөгөө авах
            </Link>
            <Link href="/portal" className="rounded-md border border-brand-300 px-5 py-3 text-sm font-medium text-white hover:bg-brand-700">
              Харилцагчийн портал
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-2xl md:text-3xl">Үйлчилгээний чиглэл</h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map((service) => (
            <div key={service.title} className="rounded-lg border border-brand-100 p-6">
              <h3 className="text-lg">{service.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{service.text}</p>
            </div>
          ))}
        </div>
        <Link href="/services" className="mt-6 inline-block text-sm font-medium text-brand-500 hover:underline">
          Бүх үйлчилгээг харах →
        </Link>
      </section>

      <section className="bg-brand-50">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="flex items-end justify-between">
            <h2 className="text-2xl md:text-3xl">Сүүлийн мэдээ, зөвлөгөө</h2>
            <Link href="/news" className="text-sm font-medium text-brand-500 hover:underline">Бүгдийг харах →</Link>
          </div>
          {posts.length === 0 ? (
            <Placeholder label="Нийтлэл байхгүй эсвэл API холбогдоогүй байна" className="mt-8" />
          ) : (
            <div className="mt-8 grid gap-6 md:grid-cols-3">
              {posts.map((post) => (
                <article key={post.id} className="rounded-lg border border-brand-100 bg-white p-6">
                  <p className="text-xs font-semibold uppercase tracking-wide text-accent-600">
                    {CATEGORY_LABELS[post.category]}
                  </p>
                  <h3 className="mt-2 text-lg">
                    <Link href={`/news/${post.slug}`} className="hover:text-brand-500">{post.title}</Link>
                  </h3>
                  <p className="mt-2 line-clamp-3 text-sm text-slate-600">{post.excerpt}</p>
                  <p className="mt-4 text-xs text-slate-500">{formatDate(post.publishedAt)}</p>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <Placeholder label="Танилцуулга / статистик / харилцагчийн сэтгэгдэл — Figma дизайн орж ирэхэд солигдоно" />
      </section>
    </>
  );
}
