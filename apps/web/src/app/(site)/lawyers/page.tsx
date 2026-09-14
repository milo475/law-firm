import type { Metadata } from 'next';
import { LawyerCard } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/states';
import { apiFetch, type LawyerProfile } from '@/lib/api';
import { shortName } from '@/lib/utils';

export const metadata: Metadata = { title: 'Хуульчид', description: 'Тулгуур Хуулийн Фирмийн мэргэшсэн хуульчдын баг.' };
export const revalidate = 60;

export default async function LawyersPage() {
  let lawyers: LawyerProfile[] = [];
  let failed = false;
  try {
    lawyers = await apiFetch<LawyerProfile[]>('/lawyers', { next: { revalidate: 60 } });
  } catch {
    failed = true;
  }

  return (
    <>
      <PageHeader overline="Баг" title="Хуульчдын баг" description="Иргэний, бизнесийн, гэр бүлийн, хөдөлмөрийн болон эрүүгийн эрх зүйн чиглэлээр мэргэшсэн хуульчид." crumbs={[{ label: 'Нүүр', href: '/' }, { label: 'Хуульчид' }]} />
      <section className="mx-auto max-w-[1200px] px-4 py-16 md:px-6 md:py-24">
        {failed ? (
          <EmptyState title="Хуульчдын мэдээлэл ачаалагдсангүй" description="API-тай холбогдож чадсангүй. Түр хүлээгээд дахин оролдоно уу." />
        ) : lawyers.length === 0 ? (
          <EmptyState title="Хуульчийн мэдээлэл байхгүй байна" />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {lawyers.map((l) => (
              <LawyerCard key={l.id} name={shortName(l.user.firstName, l.user.lastName)} title={l.title} experience={`${l.yearsOfExperience} жилийн туршлага`} href={`/lawyers/${l.id}`} imageUrl={l.user.avatarUrl} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
