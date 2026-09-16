// Figma: 01 Public Site / Public / 01 Home / Desktop (15:19) + Mobile (24:1007)
import Link from 'next/link';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ImagePlaceholder, LawyerCard, NewsCard, ServiceCard } from '@/components/ui/card';
import { SERVICES } from '@/content/services';
import { TESTIMONIALS } from '@/content/testimonials';
import { apiFetch, type LawyerProfile, type Paginated, type PostListItem } from '@/lib/api';
import { loadFirmSettings } from '@/lib/firm';
import { CATEGORY_LABELS, formatDate, formatPhone, phoneHref } from '@/lib/format';
import { cn, shortName } from '@/lib/utils';

export const revalidate = 60;

/** null when the API call failed, so an empty list and an unreachable API read differently. */
async function load<T>(path: string): Promise<T | null> {
  try {
    return await apiFetch<T>(path, { next: { revalidate: 60 } });
  } catch {
    return null;
  }
}

// Hero "Trust" row (desktop only in Figma)
const HERO_STATS = [
  { value: '17', label: 'жилийн туршлага' },
  { value: '1 200+', label: 'шийдвэрлэсэн хэрэг' },
  { value: '24', label: 'мэргэшсэн хуульч' },
];

// Advantages band — "Stats" (16:92 desktop / 24:1085 mobile)
const ADVANTAGES = [
  { value: '17', label: 'Жилийн туршлага', note: '2009 оноос хойш тасралтгүй' },
  { value: '1 200+', label: 'Шийдвэрлэсэн хэрэг', note: 'Иргэний болон эрүүгийн' },
  { value: '94%', label: 'Амжилттай шийдвэрлэлт', note: 'Сүүлийн 3 жилийн дундаж' },
  { value: '24', label: 'Мэргэшсэн хуульч', note: '6 чиглэлээр мэргэшсэн' },
];

// Section paddings: Figma desktop px-120/py-96 inside a 1440 frame (=1200 content), mobile px-20/py-56.
const SECTION = 'mx-auto w-full max-w-[1200px] px-5 py-14 md:px-6 md:py-24';

export default async function HomePage() {
  const [lawyers, posts, firm] = await Promise.all([
    load<LawyerProfile[]>('/lawyers'),
    load<Paginated<PostListItem>>('/posts?limit=3'),
    loadFirmSettings(),
  ]);

  return (
    <>
      {/* Hero (15:45 / 24:1018) */}
      <section className="bg-bg-surface">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-5 px-5 py-10 md:px-6 md:py-24 lg:flex-row lg:items-center lg:gap-20">
          <div className="flex flex-col gap-5 lg:w-[560px] lg:shrink-0 lg:gap-6">
            <p className="text-overline text-text-accent">
              <span className="md:hidden">Эрх зүйн зөвлөх үйлчилгээ</span>
              <span className="hidden md:inline">Эрх зүйн зөвлөх үйлчилгээ · 2009 оноос</span>
            </p>
            <h1 className="font-serif text-[32px] font-bold leading-10 tracking-[-0.5px] text-text-brand md:text-h1">
              Таны эрхийг хамгаалах бат бөх түшиг
            </h1>
            <p className="text-body text-text-secondary md:max-w-[520px] md:text-body-lg">
              <span className="md:hidden">24 хуульчийн баг зургаан чиглэлээр мэргэжлийн туслалцаа үзүүлнэ. Эхний зөвлөгөө үнэгүй.</span>
              <span className="hidden md:inline">
                Иргэний, эрүүгийн, гэр бүлийн болон бизнесийн эрх зүйн чиглэлээр 24 хуульчийн баг танд мэргэжлийн туслалцаа үзүүлнэ. Эхний зөвлөгөө үнэ төлбөргүй.
              </span>
            </p>
            <div className="flex flex-col gap-5 md:flex-row md:flex-wrap md:gap-4 md:pt-2">
              <Button asChild size="lg" className="w-full md:w-auto"><Link href="/contact">Үнэгүй зөвлөгөө авах</Link></Button>
              <Button asChild variant="secondary" size="lg" className="w-full md:w-auto"><Link href="/services">Үйлчилгээ үзэх</Link></Button>
            </div>
            <dl className="hidden flex-wrap gap-8 pt-6 md:flex">
              {HERO_STATS.map((s) => (
                <div key={s.label} className="flex flex-col gap-0.5">
                  <dt className="sr-only">{s.label}</dt>
                  <dd className="text-h4 text-text-brand">{s.value}</dd>
                  <dd className="text-body-sm text-text-muted">{s.label}</dd>
                </div>
              ))}
            </dl>
          </div>
          <ImagePlaceholder className="h-[220px] rounded-lg lg:h-[480px] lg:w-[520px] lg:shrink-0" markSize={72} />
        </div>
      </section>

      {/* Services (15:68 / 24:1028) */}
      <section className="bg-bg-page">
        <div className={cn(SECTION, 'flex flex-col gap-8 md:gap-12')}>
          <SectionHead overline="Үйлчилгээний чиглэл" title="Бид ямар асуудлыг шийдвэрлэдэг вэ?" description="Хувь хүн, аж ахуйн нэгжийн эрх зүйн асуудлыг зургаан үндсэн чиглэлээр бүрэн хамарч ажиллана." />
          <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-3">
            {SERVICES.map((s) => (
              <ServiceCard key={s.slug} title={s.title} description={s.teaser} href={`/services/${s.slug}`} />
            ))}
          </div>
        </div>
      </section>

      {/* Advantages (16:87 / 24:1081) */}
      <section className="bg-bg-inverse">
        <div className={cn(SECTION, 'flex flex-col gap-8 md:gap-14')}>
          <SectionHead
            inverse
            overline="Бидний давуу тал"
            title="Тоо баримтаар илэрхийлэгдэх итгэл"
            description="17 жилийн хугацаанд хуримтлуулсан туршлага, тогтвортой багийн хамт олон."
          />
          <ul className="grid grid-cols-2 gap-x-4 gap-y-6 lg:grid-cols-4 lg:gap-8">
            {ADVANTAGES.map((a) => (
              <li key={a.label} className="flex flex-col gap-1 lg:gap-2 lg:border-l-2 lg:border-border-inverse lg:py-1 lg:pl-7">
                {/* Mobile: Heading/H2 serif gold; desktop: Data/Number (Inter 40/48 bold) */}
                <p className="text-h2 text-accent-default lg:font-sans lg:text-[40px] lg:font-bold lg:leading-12 lg:tracking-[-0.5px]">{a.value}</p>
                <p className="text-body-sm text-text-on-inverse-muted lg:text-body-medium lg:text-text-on-inverse">{a.label}</p>
                <p className="hidden text-body-sm text-text-on-inverse-muted lg:block">{a.note}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Team (16:109 / 24:1098) */}
      <section className="bg-bg-surface">
        <div className={cn(SECTION, 'flex flex-col gap-8 md:gap-12')}>
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between md:gap-8">
            <SectionHead overline="Хуульчдын баг" title="Таны хэргийг хариуцах мэргэжилтнүүд" />
            <Button asChild variant="secondary" size="md" className="hidden md:inline-flex"><Link href="/lawyers">Бүх хуульчид</Link></Button>
          </div>
          {!lawyers ? (
            <p className="text-body text-text-muted">Хуульчдын мэдээлэл түр ачаалагдсангүй.</p>
          ) : lawyers.length === 0 ? (
            <p className="text-body text-text-muted">Хуульчдын мэдээлэл удахгүй нэмэгдэнэ.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
              {lawyers.slice(0, 4).map((l, i) => (
                <LawyerCard
                  key={l.id}
                  name={shortName(l.user.firstName, l.user.lastName)}
                  title={l.specializations.length ? l.specializations.slice(0, 2).join(', ') : l.title}
                  experience={`${l.yearsOfExperience} жилийн туршлага`}
                  href={`/lawyers/${l.id}`}
                  imageUrl={l.user.avatarUrl}
                  // Mobile design shows the first two lawyers only
                  className={i >= 2 ? 'hidden md:flex' : undefined}
                />
              ))}
            </div>
          )}
          <Button asChild variant="secondary" size="md" className="w-full md:hidden"><Link href="/lawyers">Бүх хуульчид</Link></Button>
        </div>
      </section>

      {/* News (16:145 / 24:1119) */}
      <section className="bg-bg-page">
        <div className={cn(SECTION, 'flex flex-col gap-8 md:gap-12')}>
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between md:gap-8">
            <SectionHead
              overline="Мэдээ ба нийтлэл"
              title={
                <>
                  <span className="md:hidden">Хуулийн орчны сүүлийн мэдээлэл</span>
                  <span className="hidden md:inline">Хуулийн орчны сүүлийн үеийн мэдээлэл</span>
                </>
              }
            />
            <Button asChild variant="secondary" size="md" className="hidden md:inline-flex"><Link href="/news">Бүх нийтлэл</Link></Button>
          </div>
          {!posts ? (
            <p className="text-body text-text-muted">Нийтлэл түр ачаалагдсангүй.</p>
          ) : posts.items.length === 0 ? (
            <p className="text-body text-text-muted">Нийтлэл удахгүй нийтлэгдэнэ.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-3 md:gap-8">
              {posts.items.map((p, i) => (
                <NewsCard
                  key={p.id}
                  overline={CATEGORY_LABELS[p.category]}
                  title={p.title}
                  excerpt={p.excerpt}
                  meta={`${formatDate(p.publishedAt)} · ${p.viewCount} үзсэн`}
                  href={`/news/${p.slug}`}
                  imageUrl={p.coverImageUrl}
                  // Mobile design shows the first two posts only
                  className={i >= 2 ? 'hidden md:flex' : undefined}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Testimonials (16:177) — desktop design only */}
      <section className="hidden bg-bg-surface md:block">
        <div className={cn(SECTION, 'flex flex-col gap-12')}>
          <SectionHead overline="Харилцагчийн сэтгэгэл" title="Бидний ажлыг харилцагчид ингэж үнэлдэг" />
          <div className="grid gap-8 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <figure key={t.id} className="flex flex-col gap-6 rounded-lg border border-border-default bg-bg-page p-8">
                <span aria-hidden className="text-h1 text-accent-default">“</span>
                <blockquote className="text-body text-text-primary">{t.quote}</blockquote>
                <figcaption className="mt-auto flex items-center gap-3">
                  <Avatar size="sm" initials={t.initials} className="size-10" />
                  <div className="flex flex-col gap-0.5">
                    <p className="text-body-sm-medium text-text-primary">{t.author}</p>
                    <p className="text-caption text-text-muted">{t.role}</p>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* CTA band (16:209 / 24:1140) */}
      <section className="bg-bg-accent-soft">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-4 px-5 py-12 md:flex-row md:items-center md:justify-between md:gap-8 md:px-6 md:py-[72px]">
          <div className="flex flex-col gap-4 md:gap-3">
            <h2 className="font-serif text-[20px] font-semibold leading-7 text-text-brand md:text-h3">
              Асуудлаа хэрхэн шийдвэрлэхээ мэдэхгүй байна уу?
            </h2>
            <p className="text-body text-text-secondary md:max-w-[720px] md:text-body-lg">
              <span className="md:hidden">30 минутын үнэгүй зөвлөгөөнд бүртгүүлээрэй.</span>
              <span className="hidden md:inline">30 минутын үнэгүй анхан шатны зөвлөгөөнд бүртгүүлээрэй. Ажлын 1 өдрийн дотор холбогдоно.</span>
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-3 md:flex-row">
            <Button asChild size="lg" className="w-full md:w-auto"><Link href="/contact">Зөвлөгөө авах</Link></Button>
            <Button asChild variant="ghost" size="lg" className="hidden md:inline-flex"><a href={phoneHref(firm.phone)}>{formatPhone(firm.phone)}</a></Button>
          </div>
        </div>
      </section>
    </>
  );
}

/** Section "Head": overline + H2 (+ optional Body/Large description, desktop only). */
function SectionHead({ overline, title, description, inverse }: { overline: string; title: React.ReactNode; description?: string; inverse?: boolean }) {
  return (
    <div className="flex flex-col gap-3 md:gap-4">
      <p className={`text-overline ${inverse ? 'text-accent-default' : 'text-text-accent'}`}>{overline}</p>
      {/* Plain template strings: twMerge would treat `text-h2` as a colour utility and drop it. */}
      <h2 className={`font-serif text-[26px] font-semibold leading-[34px] tracking-[-0.2px] md:text-h2 ${inverse ? 'text-text-on-inverse' : 'text-text-primary'}`}>
        {title}
      </h2>
      {description && (
        <p className={`hidden max-w-[760px] text-body-lg md:block ${inverse ? 'text-text-on-inverse-muted' : 'text-text-secondary'}`}>{description}</p>
      )}
    </div>
  );
}
