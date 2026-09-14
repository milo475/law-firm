import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LawyerCard, NewsCard, ServiceCard } from '@/components/ui/card';
import { SERVICES } from '@/content/services';
import { TESTIMONIALS } from '@/content/testimonials';
import { apiFetch, type LawyerProfile, type Paginated, type PostListItem } from '@/lib/api';
import { CATEGORY_LABELS, formatDate } from '@/lib/format';
import { shortName } from '@/lib/utils';

export const revalidate = 60;

async function load<T>(path: string, fallback: T): Promise<T> {
  try {
    return await apiFetch<T>(path, { next: { revalidate: 60 } });
  } catch {
    return fallback;
  }
}

const ADVANTAGES = [
  { title: '15+ жилийн туршлага', text: '2009 оноос хойш 1,200 гаруй хэргийг амжилттай шийдвэрлэсэн.' },
  { title: 'Ил тод үнэ', text: 'Ажил эхлэхээс өмнө зардлын тооцоог бичгээр танилцуулна.' },
  { title: 'Бодит цагийн портал', text: 'Хэргийн явц, баримт, нэхэмжлэхээ хэдийд ч онлайнаар хянана.' },
  { title: 'Нууцлал', text: 'Хуульч-үйлчлүүлэгчийн нууцлалыг чанд сахиж, мэдээллийг шифрлэн хадгална.' },
];

export default async function HomePage() {
  const [lawyers, posts] = await Promise.all([
    load<LawyerProfile[]>('/lawyers', []),
    load<Paginated<PostListItem>>('/posts?limit=3', { items: [], total: 0, page: 1, limit: 3, totalPages: 1 }),
  ]);

  return (
    <>
      {/* Hero */}
      <section className="border-b border-border-default bg-bg-brand-soft">
        <div className="mx-auto grid max-w-[1200px] gap-10 px-4 py-16 md:px-6 md:py-24 lg:grid-cols-[1fr_440px] lg:items-center">
          <div className="flex flex-col gap-6">
            <p className="text-overline text-text-accent">Тулгуур Хуулийн Фирм</p>
            <h1 className="text-h2 md:text-h1">Эрх зүйн найдвартай түнш</h1>
            <p className="max-w-[640px] text-body-lg text-text-secondary">
              2009 оноос хойш иргэд, аж ахуйн нэгжид эрх зүйн туслалцаа үзүүлж байна. Хэргийн явцаа харилцагчийн порталаар хэдийд ч хянах боломжтой.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg"><Link href="/contact">Зөвлөгөө авах</Link></Button>
              <Button asChild variant="secondary" size="lg"><Link href="/services">Үйлчилгээ үзэх</Link></Button>
            </div>
          </div>
          <div className="hidden flex-col gap-4 rounded-xl border border-border-default bg-bg-surface p-8 lg:flex">
            {[['1,200+', 'шийдвэрлэсэн хэрэг'], ['15', 'жилийн туршлага'], ['12', 'мэргэшсэн хуульч']].map(([n, l]) => (
              <div key={l} className="flex items-baseline gap-3 border-b border-border-subtle pb-4 last:border-b-0 last:pb-0">
                <span className="font-serif text-h2 text-text-brand">{n}</span>
                <span className="text-body text-text-secondary">{l}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="mx-auto max-w-[1200px] px-4 py-16 md:px-6 md:py-24">
        <SectionHeading overline="Үйлчилгээ" title="Үйлчилгээний чиглэлүүд" href="/services" linkLabel="Бүх үйлчилгээ" />
        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((s) => <ServiceCard key={s.slug} title={s.title} description={s.short} href={`/services/${s.slug}`} />)}
        </div>
      </section>

      {/* Advantages */}
      <section className="bg-bg-inverse text-text-on-inverse">
        <div className="mx-auto max-w-[1200px] px-4 py-16 md:px-6 md:py-24">
          <p className="text-overline text-accent-default">Давуу тал</p>
          <h2 className="mt-3 text-h3 text-text-on-inverse md:text-h2">Яагаад биднийг сонгох вэ?</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {ADVANTAGES.map((a, i) => (
              <div key={a.title} className="flex flex-col gap-3 rounded-lg border border-border-inverse bg-bg-inverse-strong p-6">
                <span className="text-overline text-accent-default">0{i + 1}</span>
                <h3 className="text-h4 text-text-on-inverse">{a.title}</h3>
                <p className="text-body-sm text-text-on-inverse-muted">{a.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Lawyers */}
      <section className="mx-auto max-w-[1200px] px-4 py-16 md:px-6 md:py-24">
        <SectionHeading overline="Баг" title="Хуульчдын баг" href="/lawyers" linkLabel="Бүх хуульчид" />
        {lawyers.length === 0 ? (
          <p className="mt-8 text-body text-text-muted">Хуульчдын мэдээлэл түр ачаалагдсангүй.</p>
        ) : (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {lawyers.slice(0, 4).map((l) => (
              <LawyerCard key={l.id} name={shortName(l.user.firstName, l.user.lastName)} title={l.title} experience={`${l.yearsOfExperience} жилийн туршлага`} href={`/lawyers/${l.id}`} imageUrl={l.user.avatarUrl} />
            ))}
          </div>
        )}
      </section>

      {/* News */}
      <section className="border-y border-border-default bg-bg-surface">
        <div className="mx-auto max-w-[1200px] px-4 py-16 md:px-6 md:py-24">
          <SectionHeading overline="Мэдээ ба нийтлэл" title="Сүүлийн мэдээ, зөвлөгөө" href="/news" linkLabel="Бүх мэдээ" />
          {posts.items.length === 0 ? (
            <p className="mt-8 text-body text-text-muted">Нийтлэл түр ачаалагдсангүй.</p>
          ) : (
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {posts.items.map((p) => (
                <NewsCard key={p.id} overline={CATEGORY_LABELS[p.category]} title={p.title} excerpt={p.excerpt} meta={`${formatDate(p.publishedAt)} · ${p.viewCount} үзсэн`} href={`/news/${p.slug}`} imageUrl={p.coverImageUrl} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Testimonials */}
      <section className="mx-auto max-w-[1200px] px-4 py-16 md:px-6 md:py-24">
        <SectionHeading overline="Сэтгэгдэл" title="Харилцагчдын үнэлгээ" />
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <figure key={t.id} className="flex flex-col gap-5 rounded-lg border border-border-default bg-bg-surface p-8">
              <span aria-hidden className="font-serif text-h1 leading-none text-accent-default">“</span>
              <blockquote className="text-body text-text-primary">{t.quote}</blockquote>
              <figcaption className="mt-auto border-t border-border-subtle pt-4">
                <p className="text-body-sm-medium text-text-primary">{t.author}</p>
                <p className="text-caption text-text-muted">{t.role}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-bg-accent-soft">
        <div className="mx-auto flex max-w-[1200px] flex-col items-start gap-6 px-4 py-16 md:flex-row md:items-center md:justify-between md:px-6">
          <div className="flex flex-col gap-2">
            <h2 className="text-h3 md:text-h2">Эрх зүйн асуудлаа өнөөдөр шийдье</h2>
            <p className="text-body-lg text-text-secondary">Эхний 30 минутын зөвлөгөө үнэ төлбөргүй.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg"><Link href="/contact">Зөвлөгөө авах</Link></Button>
            <Button asChild variant="ghost" size="lg"><a href="tel:+97670001199">+976 7000-1199</a></Button>
          </div>
        </div>
      </section>
    </>
  );
}

function SectionHeading({ overline, title, href, linkLabel }: { overline: string; title: string; href?: string; linkLabel?: string }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-3">
        <p className="text-overline text-text-accent">{overline}</p>
        <h2 className="text-h3 md:text-h2">{title}</h2>
      </div>
      {href && (
        <Link href={href} className="focus-ring inline-flex h-11 items-center rounded-sm text-body-medium text-text-accent hover:underline">
          {linkLabel} →
        </Link>
      )}
    </div>
  );
}
