import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

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
