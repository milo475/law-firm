// Structure only — every string lives in messages/*.json under `services.catalog.<slug>`.
// Slugs map 1:1 to the CaseType enum in packages/shared.
import type { CaseType } from '@law-firm/shared/enums';

export interface ServicePricingRow {
  label: string;
  value: string;
}

export interface ServiceDefinition {
  slug: string;
  caseType: CaseType;
}

export const SERVICES: ServiceDefinition[] = [
  { slug: 'civil', caseType: 'CIVIL' },
  { slug: 'criminal', caseType: 'CRIMINAL' },
  { slug: 'family', caseType: 'FAMILY' },
  { slug: 'business', caseType: 'BUSINESS' },
  { slug: 'labor', caseType: 'LABOR' },
  { slug: 'real-estate', caseType: 'REAL_ESTATE' },
];

/** FAQ ids per service, in the order the detail page shows them (texts: services.catalog.<slug>.faq.<id>). */
export const SERVICE_FAQ_IDS: Record<string, string[]> = {
  civil: ['when', 'docs', 'fee', 'duration'],
  criminal: ['when', 'docs', 'fee', 'duration'],
  family: ['when', 'docs', 'fee', 'privacy'],
  business: ['monthly', 'docs', 'fee', 'duration'],
  labor: ['when', 'docs', 'fee', 'duration'],
  'real-estate': ['check', 'docs', 'fee', 'duration'],
};

export function findService(slug: string): ServiceDefinition | undefined {
  return SERVICES.find((service) => service.slug === slug);
}
