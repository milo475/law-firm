export const TESTIMONIAL_EVENTS = {
  created: 'testimonial.created',
  published: 'testimonial.published',
  rejected: 'testimonial.rejected',
} as const;

export interface TestimonialRef {
  id: string;
  authorName: string;
  /** Null for a manual row typed in by staff. */
  authorUserId: string | null;
  caseNumber: string | null;
}

export interface TestimonialCreatedEvent {
  testimonial: TestimonialRef;
}

export interface TestimonialReviewedEvent {
  testimonial: TestimonialRef;
  actorId: string;
}
