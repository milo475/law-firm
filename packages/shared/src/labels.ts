import type {
  CaseEventType,
  CaseStatus,
  CaseType,
  ContactStatus,
  DocumentRequestStatus,
  InvoiceStatus,
  PostCategory,
  PostStatus,
  Role,
} from './generated/prisma/enums.js';

// Mongolian display labels for every enum — used by both the API and the web UI.

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Админ',
  LAWYER: 'Хуульч',
  CLIENT: 'Харилцагч',
};

export const POST_CATEGORY_LABELS: Record<PostCategory, string> = {
  NEWS: 'Мэдээ',
  ADVICE: 'Зөвлөгөө',
  LEGAL_UPDATE: 'Хууль тогтоомжийн шинэчлэл',
};

export const POST_STATUS_LABELS: Record<PostStatus, string> = {
  DRAFT: 'Ноорог',
  PUBLISHED: 'Нийтэлсэн',
  ARCHIVED: 'Архивласан',
};

export const CASE_TYPE_LABELS: Record<CaseType, string> = {
  CIVIL: 'Иргэний хэрэг',
  CRIMINAL: 'Эрүүгийн хэрэг',
  FAMILY: 'Гэр бүлийн хэрэг',
  BUSINESS: 'Бизнесийн маргаан',
  LABOR: 'Хөдөлмөрийн маргаан',
  REAL_ESTATE: 'Үл хөдлөх хөрөнгө',
  OTHER: 'Бусад',
};

export const CASE_STATUS_LABELS: Record<CaseStatus, string> = {
  NEW: 'Шинэ',
  IN_PROGRESS: 'Явагдаж буй',
  WAITING: 'Хүлээгдэж буй',
  CLOSED: 'Хаагдсан',
};

export const CASE_EVENT_TYPE_LABELS: Record<CaseEventType, string> = {
  NOTE: 'Тэмдэглэл',
  HEARING: 'Шүүх хурал',
  MEETING: 'Уулзалт',
  DEADLINE: 'Эцсийн хугацаа',
  STATUS_CHANGE: 'Төлөв өөрчлөгдсөн',
  DOCUMENT: 'Баримт бичиг',
};

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  DRAFT: 'Ноорог',
  SENT: 'Илгээсэн',
  AWAITING_CONFIRMATION: 'Баталгаажуулж буй',
  PAID: 'Төлөгдсөн',
  OVERDUE: 'Хугацаа хэтэрсэн',
  CANCELLED: 'Цуцалсан',
};

export const CONTACT_STATUS_LABELS: Record<ContactStatus, string> = {
  NEW: 'Шинэ',
  CONTACTED: 'Холбогдсон',
  CLOSED: 'Хаагдсан',
};

export const DOCUMENT_REQUEST_STATUS_LABELS: Record<DocumentRequestStatus, string> = {
  PENDING: 'Хүлээгдэж буй',
  SUBMITTED: 'Илгээсэн',
  UNDER_REVIEW: 'Хянагдаж буй',
  APPROVED: 'Батлагдсан',
  REJECTED: 'Буцаагдсан',
};
