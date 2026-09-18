// The practice areas the public site filters lawyers by. Structure only — the labels live in
// messages/*.json under `services.short.<key>`, so the chips follow the reader's language.
//
// `key` is the stable ASCII value used in URLs (`/lawyers?spec=civil`), identical to the service slug
// (and therefore to a CaseType, see SERVICES in ./services).
// `match` holds the lower-case fragments we look for in LawyerProfile.specializations, which the firm
// types as free Mongolian text ("Иргэний эрх зүй", "Хөдөлмөрийн маргаан", …).

export const SPECIALIZATION_FILTERS = [
  { key: 'civil', match: ['иргэн'] },
  { key: 'criminal', match: ['эрүү'] },
  { key: 'family', match: ['гэр бүл'] },
  { key: 'business', match: ['бизнес', 'компани'] },
  { key: 'labor', match: ['хөдөлмөр'] },
  { key: 'real-estate', match: ['үл хөдлөх', 'газар'] },
] as const;

export type SpecializationKey = (typeof SPECIALIZATION_FILTERS)[number]['key'];

export function isSpecializationKey(value: string): value is SpecializationKey {
  return SPECIALIZATION_FILTERS.some((filter) => filter.key === value);
}

/** True when any of the free-text values (specialisations, job title) mentions this area. */
export function matchesSpecialization(values: string[], key: SpecializationKey): boolean {
  const filter = SPECIALIZATION_FILTERS.find((item) => item.key === key);
  if (!filter) return false;
  const haystack = values.join(' · ').toLowerCase();
  return filter.match.some((needle) => haystack.includes(needle));
}

/**
 * Mongolian text → key, for the links that were shared before the filter used keys
 * (`?spec=Иргэний`) and for anything else that arrives as free text.
 */
export function specializationKeyFor(text: string): SpecializationKey | undefined {
  const value = text.trim().toLowerCase();
  if (!value) return undefined;
  return SPECIALIZATION_FILTERS.find((filter) => filter.match.some((needle) => value.includes(needle)))?.key;
}
