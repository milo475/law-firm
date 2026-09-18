import { getTranslations } from 'next-intl/server';
import { StarIcon } from '@/components/icons';
import type { PublicTestimonial } from '@/lib/api';
import { formatDate } from '@/lib/format';
import type { Locale } from '@/i18n/routing';
import { cn } from '@/lib/utils';

/** Filled / empty stars with the rating also written out for screen readers. */
async function Rating({ value, locale }: { value: number; locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'reviews' });
  return (
    <p className="flex items-center gap-1" aria-label={t('ratingLabel', { rating: value })}>
      {[1, 2, 3, 4, 5].map((star) => (
        <StarIcon key={star} aria-hidden className={cn('size-4', star <= value ? 'text-accent-default' : 'text-border-default')} />
      ))}
    </p>
  );
}

/**
 * One published testimonial. The text stays in the language the client wrote it in — only the
 * surrounding labels follow the reader (see the note above the lists).
 */
export async function TestimonialCard({
  testimonial,
  locale,
  className,
}: {
  testimonial: PublicTestimonial;
  locale: Locale;
  className?: string;
}) {
  const tCase = await getTranslations({ locale, namespace: 'enums.caseType' });
  return (
    <figure
      className={cn(
        'flex h-full flex-col gap-4 rounded-lg border border-border-default bg-bg-surface p-5 md:gap-5 md:p-6',
        className,
      )}
    >
      {testimonial.rating !== null && <Rating value={testimonial.rating} locale={locale} />}
      <blockquote className="flex-1 whitespace-pre-line text-body-sm text-text-secondary md:text-body">{testimonial.body}</blockquote>
      <figcaption className="flex flex-col gap-1.5 border-t border-border-subtle pt-4">
        <span className="text-body-medium text-text-primary">{testimonial.authorName}</span>
        {testimonial.authorTitle && <span className="text-body-sm text-text-secondary">{testimonial.authorTitle}</span>}
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-text-muted">
          {testimonial.caseType && (
            <span className="rounded-full bg-bg-brand-soft px-2.5 py-0.5 text-text-brand">{tCase(testimonial.caseType)}</span>
          )}
          {testimonial.publishedAt && <span>{formatDate(testimonial.publishedAt, locale)}</span>}
        </span>
      </figcaption>
    </figure>
  );
}

/** Shown above a list when the reader's language is not the language the clients wrote in. */
export async function OriginalLanguageNote({ locale }: { locale: Locale }) {
  if (locale === 'mn') return null;
  const t = await getTranslations({ locale, namespace: 'reviews' });
  return <p className="text-body-sm text-text-muted">{t('inOriginalLanguage')}</p>;
}
