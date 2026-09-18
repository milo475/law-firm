/**
 * Prices, free-consultation offers and response times — the commitments a lawyer has to confirm
 * before the site makes them. Everything is `null` while they are unconfirmed, and the pages fall
 * back to describing what happens instead of promising a number or a deadline.
 *
 * To put one back: fill in the value here and it reappears everywhere it is used. The comment on
 * each field is the wording the site carried before, so nothing has to be reconstructed.
 */
export interface Commitments {
  /** Price card + FAQ. Was: 'Үнэгүй · 30 мин'. */
  firstConsultation: string | null;
  /** Price card (business, labour). Was: '150 000₮-оос'. */
  writtenOpinion: string | null;
  /** Price card (real estate). Was: '150 000₮-оос'. */
  assetCheck: string | null;
  /** Price card + criminal FAQ. Was: '24 цагийн дотор'. */
  urgentResponse: string | null;
  /** Contact and FAQ pages, home CTA. Was: 'Ажлын 1 өдрийн дотор'. */
  responseTime: string | null;
  /** Footer "Ажлын байр" link. Was: 'careers@lawfirm.mn' — the domain is not registered yet. */
  careersEmail: string | null;
}

export const COMMITMENTS: Commitments = {
  firstConsultation: null,
  writtenOpinion: null,
  assetCheck: null,
  urgentResponse: null,
  responseTime: null,
  careersEmail: null,
};

/** A price-card row, only when the amount is confirmed. Spread it into a `pricing` array. */
export function priceRow(label: string, value: string | null): { label: string; value: string }[] {
  return value ? [{ label, value }] : [];
}
