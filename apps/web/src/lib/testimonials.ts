'use client';

import { useQuery } from '@tanstack/react-query';
import { api, type MyTestimonial } from './api';

/** Every testimonial query starts with this key, so one invalidation refreshes lists and badges. */
export const TESTIMONIALS_KEY = ['testimonials'] as const;
export const MY_TESTIMONIALS_KEY = ['testimonials', 'mine'] as const;

/** The signed-in client's own testimonials, with the review status. */
export function useMyTestimonials(enabled = true) {
  return useQuery({
    queryKey: MY_TESTIMONIALS_KEY,
    queryFn: () => api.get<MyTestimonial[]>('/testimonials/mine'),
    enabled,
  });
}
