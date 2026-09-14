import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ApiError, apiFetch, type LawyerProfile } from '@/lib/api';

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
  return { title: `${lawyer.user.lastName.charAt(0)}. ${lawyer.user.firstName} — ${lawyer.title}` };
}

export default async function LawyerDetailPage({ params }: Params) {
  const { id } = await params;
  const lawyer = await loadLawyer(id);
  if (!lawyer) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <Link href="/lawyers" className="text-sm text-brand-500 hover:underline">← Бүх хуульчид</Link>
      <div className="mt-6 grid gap-8 md:grid-cols-[240px_1fr]">
        <div className="h-60 rounded-lg bg-brand-50" aria-hidden />
        <div>
          <h1 className="text-3xl">{lawyer.user.lastName.charAt(0)}. {lawyer.user.firstName}</h1>
          <p className="mt-1 text-accent-600">{lawyer.title}</p>
          <p className="mt-1 text-sm text-slate-500">{lawyer.yearsOfExperience} жилийн туршлага</p>

          <h2 className="mt-8 text-xl">Танилцуулга</h2>
          <p className="mt-2 text-slate-600">{lawyer.bio}</p>

          <h2 className="mt-8 text-xl">Мэргэшил</h2>
          <ul className="mt-2 flex flex-wrap gap-2">
            {lawyer.specializations.map((s) => (
              <li key={s} className="rounded-full bg-brand-50 px-3 py-1 text-sm text-brand-700">{s}</li>
            ))}
          </ul>

          <h2 className="mt-8 text-xl">Боловсрол</h2>
          <p className="mt-2 text-slate-600">{lawyer.education}</p>

          <Link href="/contact" className="mt-8 inline-block rounded-md bg-brand-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700">
            Уулзалт товлох
          </Link>
        </div>
      </div>
    </div>
  );
}
