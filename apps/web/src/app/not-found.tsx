import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <p className="text-sm font-medium uppercase tracking-widest text-accent-600">404</p>
      <h1 className="text-3xl">Хуудас олдсонгүй</h1>
      <p className="max-w-md text-slate-600">Таны хайсан хуудас байхгүй эсвэл шилжсэн байна.</p>
      <Link href="/" className="rounded-md bg-brand-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700">
        Нүүр хуудас руу буцах
      </Link>
    </main>
  );
}
