import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// The Figma text-style utilities (text-h1 … text-label-field) look like text-colour classes to
// tailwind-merge; register them as font-size utilities so `cn('text-body', 'text-text-secondary')`
// keeps both.
const TYPOGRAPHY_UTILITIES = [
  'text-h1', 'text-h2', 'text-h3', 'text-h4',
  'text-body-lg', 'text-body', 'text-body-medium', 'text-body-sm', 'text-body-sm-medium',
  'text-caption', 'text-overline', 'text-label-sm', 'text-label-md', 'text-label-lg', 'text-label-field',
];

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: { 'font-size': TYPOGRAPHY_UTILITIES },
  },
});

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** "Ганбат" + "Сүх" → "СГ" (last-name initial first, as in the Figma avatars). */
export function initials(firstName?: string | null, lastName?: string | null): string {
  const a = (lastName ?? '').trim().charAt(0);
  const b = (firstName ?? '').trim().charAt(0);
  return `${a}${b}`.toUpperCase() || '?';
}

/** "Ганбат" + "Сүх" → "С. Ганбат" */
export function shortName(firstName?: string | null, lastName?: string | null): string {
  const initial = (lastName ?? '').trim().charAt(0);
  return initial ? `${initial}. ${firstName ?? ''}`.trim() : (firstName ?? '');
}
