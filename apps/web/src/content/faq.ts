// Structure only — the questions and answers live in messages/*.json under `faq.categories` / `faq.items`.
export interface FaqCategoryDefinition {
  id: string;
}

export interface FaqItemDefinition {
  id: string;
  category: string;
}

export const FAQ_CATEGORIES: FaqCategoryDefinition[] = [
  { id: 'general' },
  { id: 'payment' },
  { id: 'labor' },
  { id: 'family' },
  { id: 'criminal' },
  { id: 'portal' },
];

export const FAQ: FaqItemDefinition[] = [
  { id: 'first-consult', category: 'general' },
  { id: 'bring-documents', category: 'general' },
  { id: 'track-case', category: 'general' },
  { id: 'fees', category: 'payment' },
  { id: 'advance', category: 'payment' },
  { id: 'invoices', category: 'payment' },
  { id: 'dismissal-deadline', category: 'labor' },
  { id: 'compensation', category: 'labor' },
  { id: 'divorce-duration', category: 'family' },
  { id: 'child-support', category: 'family' },
  { id: 'urgent', category: 'criminal' },
  { id: 'interrogation', category: 'criminal' },
  { id: 'portal-login', category: 'portal' },
  { id: 'documents', category: 'portal' },
  { id: 'confidentiality', category: 'portal' },
];
