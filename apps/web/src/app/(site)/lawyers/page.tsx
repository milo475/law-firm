import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { Placeholder } from '@/components/ui/placeholder';
import { apiFetch, type LawyerProfile } from '@/lib/api';

export const metadata: Metadata = { title: 'Хуульчид' };
export const revalidate = 60;

async function loadLawyers(): Promise<LawyerProfile[]> {
  try {
    return await apiFetch<LawyerProfile[]>('/lawyers', { next: { revalidate: 60 } });
  } catch {
    return [];
  }
}

export default async function LawyersPage() {
  const lawyers = await loadLawyers();
  return (
    <>
      <PageHeader overline="Баг" title="Манай хуульчид" description="Туршлагатай, мэргэшсэн хуульчдын баг танд үйлчилнэ." />
      <div className="mx-auto max-w-6xl px-4 py-12">
        {lawyers.length === 0 ? (
          <Placeholder label="Хуульчдын мэдээлэл олдсонгүй эсвэл API холбогдоогүй байна" />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {lawyers.map((lawyer) => (
              <article key={lawyer.id} className="rounded-lg border border-brand-100 p-6">
                <div className="h-40 rounded-md bg-brand-50" aria-hidden />
                <h2 className="mt-4 text-xl">
                  <Link href={`/lawyers/${lawyer.id}`} className="hover:text-brand-500">
                    {lawyer.user.lastName.charAt(0)}. {lawyer.user.firstName}
                  </Link>
                </h2>
                <p className="text-sm text-accent-600">{lawyer.title}</p>
                <p className="mt-2 text-xs text-slate-500">{lawyer.yearsOfExperience} жилийн туршлага</p>
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {lawyer.specializations.map((s) => (
                    <li key={s} className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs text-brand-700">{s}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
