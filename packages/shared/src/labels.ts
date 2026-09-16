import type {
  CaseEventType,
  CaseStatus,
  CaseType,
  ContactStatus,
  CaseMemberRole,
  DocumentRequestStatus,
  InvoiceStatus,
  PostCategory,
  PostStatus,
  ServiceRequestStatus,
  ServiceRequestType,
  TaskPriority,
  TaskStatus,
  Role,
} from './generated/prisma/enums.js';

// Mongolian display labels for every enum — used by both the API and the web UI.

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Админ',
  LAWYER: 'Хуульч',
  CLIENT: 'Харилцагч',
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


export const DOCUMENT_REQUEST_STATUS_LABELS: Record<DocumentRequestStatus, string> = {
  PENDING: 'Хүлээгдэж буй',
  SUBMITTED: 'Илгээсэн',
  UNDER_REVIEW: 'Хянагдаж буй',
  APPROVED: 'Батлагдсан',
  REJECTED: 'Буцаагдсан',
};


export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: 'Хийх',
  IN_PROGRESS: 'Хийгдэж буй',
  REVIEW: 'Хянах',
  DONE: 'Дууссан',
  CANCELLED: 'Цуцалсан',
};


export const SERVICE_REQUEST_TYPE_LABELS: Record<ServiceRequestType, string> = {
  LAWYER: 'Өмгөөлөгч авах',
  CONSULTATION: 'Зөвлөгөө авах',
};

export const SERVICE_REQUEST_STATUS_LABELS: Record<ServiceRequestStatus, string> = {
  NEW: 'Шинэ',
  ACCEPTED: 'Хүлээж авсан',
  REJECTED: 'Татгалзсан',
  CONVERTED: 'Хэрэг нээгдсэн',
};
