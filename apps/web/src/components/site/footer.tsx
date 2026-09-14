import Link from 'next/link';

export function Footer() {
  return (
    <footer className="mt-auto border-t border-brand-100 bg-brand-50">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-3">
        <div>
          <p className="font-serif text-lg font-semibold text-brand-900">Хуулийн фирм</p>
          <p className="mt-2 text-sm text-slate-600">
            Иргэн, бизнесийн эрх зүйн чиглэлээр мэргэшсэн хуульчдын баг. Танд найдвартай, ойлгомжтой хууль зүйн
            үйлчилгээ үзүүлнэ.
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">Холбоосууд</p>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li><Link href="/services" className="hover:text-brand-900">Үйлчилгээ</Link></li>
            <li><Link href="/lawyers" className="hover:text-brand-900">Хуульчид</Link></li>
            <li><Link href="/news" className="hover:text-brand-900">Мэдээ, зөвлөгөө</Link></li>
            <li><Link href="/portal" className="hover:text-brand-900">Харилцагчийн портал</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">Холбоо барих</p>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li>Улаанбаатар, Сүхбаатар дүүрэг, Чингисийн өргөн чөлөө</li>
            <li>Утас: +976 7000-0000</li>
            <li>И-мэйл: info@lawfirm.mn</li>
            <li>Ажлын цаг: Да–Ба 09:00–18:00</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-brand-100 py-4 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} Хуулийн фирм. Бүх эрх хуулиар хамгаалагдсан.
      </div>
    </footer>
  );
}
