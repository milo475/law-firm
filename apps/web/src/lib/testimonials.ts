'use client';

import { useQuery } from '@tanstack/react-query';
import { api, type MyTestimonial, type TestimonialSummary } from './api';

/** Every testimonial query starts with this key, so one invalidation refreshes lists and badges. */
export const TESTIMONIALS_KEY = ['testimonials'] as const;
export const MY_TESTIMONIALS_KEY = ['testimonials', 'mine'] as const;
const TESTIMONIAL_SUMMARY_KEY = ['testimonials', 'summary'] as const;

/** The signed-in client's own testimonials, with the review status. */
export function useMyTestimonials(enabled = true) {
  return useQuery({
    queryKey: MY_TESTIMONIALS_KEY,
    queryFn: () => api.get<MyTestimonial[]>('/testimonials/mine'),
    enabled,
  });
}

/** Pending / published counts for the admin sidebar badge (ADMIN, LAWYER). */
export function useTestimonialSummary(enabled = true) {
  return useQuery({
    queryKey: TESTIMONIAL_SUMMARY_KEY,
    queryFn: () => api.get<TestimonialSummary>('/admin/testimonials/summary'),
    enabled,
    staleTime: 30_000,
  });
}

/** A testimonial the client may still edit the visibility of (published, or waiting for review). */
export const isLiveTestimonial = (item: Pick<MyTestimonial, 'status'>) => item.status === 'PUBLISHED';
