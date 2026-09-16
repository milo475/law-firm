import { EXAMPLE_FIRM_SETTINGS } from '@law-firm/shared/schemas';
import { apiFetch, type FirmSettings } from './api';
import { formatPhone } from './format';

/** Cache tag of the firm details on server-rendered pages; POST /api/revalidate/firm clears it after an ADMIN saves them. */
export const FIRM_SETTINGS_TAG = 'firm-settings';

/** Used while the API cannot be reached, so the public site and sign-in pages still show contacts. */
const FALLBACK_FIRM_SETTINGS: FirmSettings = { ...EXAMPLE_FIRM_SETTINGS, updatedAt: null };

/** Server components: the firm details, cached for a minute or until an ADMIN saves new ones. */
export async function loadFirmSettings(): Promise<FirmSettings> {
  try {
    return await apiFetch<FirmSettings>('/settings/firm', { next: { revalidate: 60, tags: [FIRM_SETTINGS_TAG] } });
  } catch {
    return FALLBACK_FIRM_SETTINGS;
  }
}

/** "РД 5190028 · +976 7000-1199" under the firm name on invoices (no registration number until one is saved). */
export function firmIssuerLine(firm: Pick<FirmSettings, 'registrationNumber' | 'phone'>): string {
  return [firm.registrationNumber ? `РД ${firm.registrationNumber}` : null, formatPhone(firm.phone)].filter(Boolean).join(' · ');
}
