import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ImagePlaceholder } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { ApiError, apiFetch, type LawyerProfile } from '@/lib/api';
import { shortName } from '@/lib/utils';

export const revalidate = 60;

type Params = { params: Promise<{ id: string }> };

async function loadLawyer(id: string): Promise<LawyerProfile | null> {
  try {
    return await apiFetch<LawyerProfile>(`/lawyers/${id}`, { next: { revalidate: 60 } });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const lawyer = await loadLawyer(id);
  if (!lawyer) return { title: 'Хуульч олдсонгүй' };
  const name = shortName(lawyer.user.firstName, lawyer.user.lastName);
  return { title: `${name} — ${lawyer.title}`, description: lawyer.bio.slice(0, 160) };
}

export default async function LawyerDetailPage({ params }: Params) {
  const { id } = await params;
  const lawyer = await loadLawyer(id);
  if (!lawyer) notFound();
  const name = shortName(lawyer.user.firstName, lawyer.user.lastName);

  return (
    <>
      <PageHeader overline={lawyer.title} title={name} crumbs={[{ label: 'Нүүр', href: '/' }, { label: 'Хуульчид', href: '/lawyers' }, { label: name }]} />
      <section className="mx-auto grid max-w-[1200px] gap-12 px-4 py-16 md:px-6 md:py-24 lg:grid-cols-[360px_1fr]">
        <div className="flex flex-col gap-6">
          <div className="overflow-hidden rounded-lg border border-border-default bg-bg-surface">
            <ImagePlaceholder src={lawyer.user.avatarUrl} className="h-[340px]" markSize={60} />
            <div className="flex flex-col gap-1.5 px-6 pb-6 pt-5">
              <p className="text-h4">{name}</p>
              <p className="text-body-sm text-text-secondary">{lawyer.title}</p>
              <p className="text-caption text-text-accent">{lawyer.yearsOfExperience} жилийн туршлага</p>
            </div>
          </div>
          <div className="flex flex-col gap-3 rounded-lg border border-border-default bg-bg-surface p-6">
            <p className="text-body-medium text-text-primary">Холбоо барих</p>
            <a href={`mailto:${lawyer.user.email}`} className="focus-ring rounded-sm text-body-sm text-text-secondary hover:text-text-brand">{lawyer.user.email}</a>
            {lawyer.user.phone && <a href={`tel:${lawyer.user.phone}`} className="focus-ring rounded-sm text-body-sm text-text-secondary hover:text-text-brand">{lawyer.user.phone}</a>}
            <Button asChild size="md" className="mt-2"><Link href="/contact">Уулзалт товлох</Link></Button>
          </div>
        </div>
        <div className="flex flex-col gap-10">
          <div>
            <h2 className="text-h3">Танилцуулга</h2>
            <p className="mt-4 text-body-lg text-text-secondary">{lawyer.bio}</p>
          </div>
          <div>
            <h2 className="text-h3">Мэргэшил</h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {lawyer.specializations.map((s) => (
                <li key={s} className="rounded-full bg-bg-brand-soft px-4 py-2 text-body-sm-medium text-text-brand">{s}</li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-h3">Боловсрол</h2>
            <p className="mt-4 text-body text-text-secondary">{lawyer.education}</p>
          </div>
        </div>
      </section>
    </>
  );
}
