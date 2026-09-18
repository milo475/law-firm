// Figma: 01 Public Site / Public / 09 FAQ / Desktop (21:840) + Mobile (26:1447)
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { FAQ, FAQ_CATEGORIES } from '@/content/faq';
import { Link } from '@/i18n/navigation';
import { alternateLanguages } from '@/lib/seo';
import { FaqNav } from './faq-nav';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'faqPage' });
  return { title: t('metaTitle'), description: t('metaDescription'), alternates: { languages: alternateLanguages('/faq') } };
}

export default async function FaqPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, tCommon, tFaq] = await Promise.all([getTranslations('faqPage'), getTranslations('common'), getTranslations('faq')]);
  const groups = FAQ_CATEGORIES.map((category) => ({
    category: {
      id: category.id,
      label: tFaq(`categories.${category.id}.label`),
      shortLabel: tFaq(`categories.${category.id}.shortLabel`),
    },
    items: FAQ.filter((item) => item.category === category.id).map((item) => ({
      id: item.id,
      question: tFaq(`items.${item.id}.question`),
      answer: tFaq(`items.${item.id}.answer`),
    })),
  })).filter((g) => g.items.length > 0);
  const firstOpen = groups[0]?.items[0]?.id;

  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('description')}
        crumbs={[{ label: tCommon('home'), href: '/' }, { label: t('crumb') }]}
      />

      {/* FAQ — white band; desktop: 300px category sidebar + questions column (gap 64); mobile: chips + flat list */}
      <section className="bg-bg-surface">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-7 px-5 py-14 md:px-6 lg:flex-row lg:items-start lg:gap-16 lg:py-24">
          <div className="lg:sticky lg:top-[112px]">
            <FaqNav categories={groups.map((g) => g.category)} />
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-7 lg:gap-10">
            <Accordion type="multiple" defaultValue={firstOpen ? [firstOpen] : []} className="flex flex-col gap-0 lg:gap-10">
              {groups.map(({ category, items }) => (
                <section key={category.id} id={category.id} aria-labelledby={`${category.id}-title`} className="flex scroll-mt-28 flex-col lg:gap-5">
                  {/* Group heading — H3 on desktop; the mobile design shows one flat list, so it stays visually hidden there */}
                  <h2 id={`${category.id}-title`} className="sr-only text-h3 text-text-primary lg:not-sr-only">{category.label}</h2>
                  <div className="flex flex-col">
                    {items.map((item) => (
                      <AccordionItem key={item.id} value={item.id} className="rounded-none border-0 border-b bg-transparent">
                        <AccordionTrigger className="rounded-none px-0 py-[18px] hover:bg-transparent lg:py-[22px]">
                          <span className="max-w-[660px] text-body-medium text-text-primary transition-colors group-hover:text-text-brand group-data-[state=open]:text-text-brand lg:text-body-lg">
                            {item.question}
                          </span>
                        </AccordionTrigger>
                        <AccordionContent className="px-0 pb-5 lg:pb-6">
                          <p className="max-w-[660px] text-body-sm text-text-secondary lg:text-body">{item.answer}</p>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </div>
                </section>
              ))}
            </Accordion>

            {/* Help — gold-100 card: desktop row (p-28), mobile column with full-width button */}
            <div className="flex flex-col gap-3 rounded-lg bg-bg-accent-soft px-5 py-6 md:flex-row md:items-center md:justify-between md:gap-6 md:p-7">
              <div className="flex flex-col gap-1.5">
                <p className="text-h4 text-text-brand">{t('helpTitle')}</p>
                <p className="text-body-sm text-text-secondary">{t('helpText')}</p>
              </div>
              <Button asChild size="md" className="w-full md:w-auto">
                <Link href="/contact">{t('helpCta')}</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
