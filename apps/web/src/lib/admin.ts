// Types and helpers for the staff admin panel (/admin). Response shapes mirror apps/api.
import type { PublicUser } from './api';

export type Role = 'ADMIN' | 'LAWYER' | 'CLIENT';
export type CaseStatus = 'NEW' | 'IN_PROGRESS' | 'WAITING' | 'CLOSED';
export type CaseType = 'CIVIL' | 'CRIMINAL' | 'FAMILY' | 'BUSINESS' | 'LABOR' | 'REAL_ESTATE' | 'OTHER';
export type CaseEventType = 'NOTE' | 'HEARING' | 'MEETING' | 'DEADLINE' | 'STATUS_CHANGE' | 'DOCUMENT';
export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';
export type ContactStatus = 'NEW' | 'CONTACTED' | 'CLOSED';
export type PostCategory = 'NEWS' | 'ADVICE' | 'LEGAL_UPDATE';
export type PostStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface LawyerProfileRecord {
  id: string;
  userId: string;
  title: string;
  bio: string;
  specializations: string[];
  education: string;
  yearsOfExperience: number;
  isPublic: boolean;
  sortOrder: number;
}

export interface AdminUser {
  id: string;
  email: string;
  phone: string | null;
  firstName: string;
  lastName: string;
  role: Role;
  avatarUrl: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  lawyerProfile: LawyerProfileRecord | null;
}

export interface StaffLawyer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  role: Role;
  isActive: boolean;
  lawyerProfile: LawyerProfileRecord | null;
}

export interface ContactRequestItem {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  subject: string;
  message: string;
  status: ContactStatus;
  createdAt: string;
}

export interface ManagedPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content?: string;
  coverImageUrl: string | null;
  category: PostCategory;
  status: PostStatus;
  publishedAt: string | null;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  author: PublicUser;
}

export const CASE_STATUSES: CaseStatus[] = ['NEW', 'IN_PROGRESS', 'WAITING', 'CLOSED'];
export const CASE_TYPES: CaseType[] = ['CIVIL', 'CRIMINAL', 'FAMILY', 'BUSINESS', 'LABOR', 'REAL_ESTATE', 'OTHER'];
export const MANUAL_EVENT_TYPES: CaseEventType[] = ['NOTE', 'HEARING', 'MEETING', 'DEADLINE', 'DOCUMENT'];
export const INVOICE_STATUSES: InvoiceStatus[] = ['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED'];

export function isStaff(role: Role | string | undefined): boolean {
  return role === 'ADMIN' || role === 'LAWYER';
}

/** `<input type="datetime-local">` value (local time) → ISO string with offset for the API. */
export function localDateTimeToIso(value: string): string {
  return new Date(value).toISOString();
}

/** ISO → `<input type="datetime-local">` value in the browser's local time. */
export function isoToLocalDateTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** `<input type="date">` value → end of that local day as ISO (used for invoice due dates). */
export function localDateToIso(value: string): string {
  return new Date(`${value}T23:59:00`).toISOString();
}

export function isoToLocalDate(iso: string | null | undefined): string {
  return isoToLocalDateTime(iso).slice(0, 10);
}
