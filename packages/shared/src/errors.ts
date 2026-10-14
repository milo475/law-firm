/**
 * Stable identities for the failures the API reports.
 *
 * The API answers in Mongolian, which is wrong for an English- or Chinese-speaking client. Rather
 * than parsing `Accept-Language` on the server and shipping three copies of every message with it,
 * each failure carries a `code` that never changes, and whoever renders it looks the wording up in
 * its own language (`errors.<code>` in the web app's messages). The Mongolian `message` travels
 * alongside as a fallback, so a client that knows nothing about codes still shows something real.
 *
 * A code is `<module>.<reason>`, lower camel after the dot. Add one here before throwing it —
 * `err()` only accepts codes from this list, and `errors.spec.ts` checks that the two agree.
 */
export const ERROR_CODES = [
  // ── Generic, by status: the filter falls back to these when nothing more precise was thrown ──
  'http.badRequest',
  'http.unauthorized',
  'http.forbidden',
  'http.notFound',
  'http.methodNotAllowed',
  'http.conflict',
  'http.payloadTooLarge',
  'http.unsupportedMediaType',
  'http.unprocessable',
  'http.tooManyRequests',
  'http.serverError',
  'http.unavailable',

  // ── Database constraints (Prisma) ───────────────────────────────────────────
  'data.duplicate',
  'data.notFound',
  'data.relatedNotFound',

  // ── Request-body validation (zod); `details` names the field and the limit ──
  'validation.failed',
  // zod does not say whether the field was missing or the wrong type, so one code covers both.
  'validation.invalidType',
  'validation.minLength',
  'validation.maxLength',
  'validation.min',
  'validation.max',
  'validation.format',
  'validation.invalidOption',

  // ── Sign-in, sessions, registration ─────────────────────────────────────────
  'auth.invalidCredentials',
  'auth.accountInactive',
  'auth.accountDisabled',
  'auth.emailTaken',
  'auth.phoneTaken',
  'auth.sessionMissing',
  'auth.sessionInvalid',
  'auth.sessionRevoked',
  'auth.sessionExpired',
  'auth.userNotFound',
  'auth.forbidden',
  'auth.linkInvalid',
  'auth.inviteInvalid',

  // ── Users ───────────────────────────────────────────────────────────────────
  'user.notFound',
  'user.clientsOnly',
  'user.lawyerRoleOnly',
  'user.cannotDeactivateSelf',
  'user.emailTaken',
  'user.phoneTaken',
  'user.currentPasswordWrong',

  // ── Cases ───────────────────────────────────────────────────────────────────
  'case.notFound',
  'case.viewForbidden',
  'case.manageForbidden',
  'case.actionForbidden',
  'case.leadOrAdminOnly',
  'case.assigneeRequired',
  'case.assigneeSelfOnly',
  'case.assigneeAdminOnly',
  'case.alreadyClosed',
  'case.clientUnavailable',
  'case.lawyerUnavailable',

  // ── Case team and timeline ──────────────────────────────────────────────────
  'caseMember.alreadyMember',
  'caseMember.notMember',
  'caseMember.leadCannotDemote',
  'caseMember.leadCannotLeave',
  'caseMember.mustBeActiveStaff',
  'caseMember.leadMustBeLawyer',
  'caseEvent.notFound',
  'caseEvent.statusChangeLocked',

  // ── Documents ───────────────────────────────────────────────────────────────
  'document.notFound',
  'document.fileRequired',
  'document.tooLarge',
  'document.unsupportedType',
  'document.contentMismatch',
  'document.viewForbidden',
  'document.deleteOwnOnly',

  // ── Document requests ───────────────────────────────────────────────────────
  'documentRequest.notFound',
  'documentRequest.caseClosed',
  'documentRequest.editLocked',
  'documentRequest.deleteHasFiles',
  'documentRequest.submitForbidden',
  'documentRequest.submitLocked',
  'documentRequest.fileRequired',
  'documentRequest.tooManyFiles',
  'documentRequest.reasonRequired',
  'documentRequest.reviewLocked',
  'documentRequest.statusChanged',

  // ── Invoices and payments ───────────────────────────────────────────────────
  'invoice.notFound',
  'invoice.invalidTransition',
  'invoice.useConfirmAction',
  'invoice.draftOnlyEdit',
  'invoice.statusChanged',
  'payment.markForbidden',
  'payment.alreadyMarked',
  'payment.statusLocked',
  'payment.reviewLocked',

  // ── Lawyer profiles ─────────────────────────────────────────────────────────
  'lawyer.notFound',
  'lawyer.profileMissing',
  'lawyer.profileExists',
  'lawyer.roleRequired',
  'lawyer.ownProfileOnly',

  // ── Articles ────────────────────────────────────────────────────────────────
  'post.notFound',
  'post.editOwnOnly',
  'post.slugUnavailable',
  'post.imageRequired',
  'post.imageTooLarge',
  'post.imageUnsupported',
  'post.imageContentMismatch',

  // ── Service requests ────────────────────────────────────────────────────────
  'serviceRequest.notFound',
  'serviceRequest.viewForbidden',
  'serviceRequest.alreadyConverted',
  'serviceRequest.rejectedLocked',
  'serviceRequest.alreadyInStatus',
  'serviceRequest.acceptFirst',
  'serviceRequest.invalidTransition',
  'serviceRequest.clientInactive',
  'serviceRequest.lawyerUnavailable',

  // ── Testimonials ────────────────────────────────────────────────────────────
  'testimonial.notFound',
  'testimonial.caseForbidden',
  'testimonial.caseNotClosed',
  'testimonial.alreadyExists',
  'testimonial.editForbidden',
  'testimonial.consentRequired',
  'testimonial.consentNoteRequired',

  // ── Staff tasks and their attachments ───────────────────────────────────────
  'task.notFound',
  'task.staffOnly',
  'task.viewForbidden',
  'task.editForbidden',
  'task.deleteForbidden',
  'task.statusForbidden',
  'task.invalidTransition',
  'task.standaloneSelfOnly',
  'task.standaloneAssignSelfOnly',
  'task.assigneeMustBeStaff',
  'task.assigneeMustBeMember',
  'taskAttachment.notFound',
  'taskAttachment.fileRequired',
  'taskAttachment.tooLarge',
  'taskAttachment.unsupportedType',
  'taskAttachment.contentMismatch',
  'taskAttachment.deleteForbidden',

  // ── Notifications, performance, settings ────────────────────────────────────
  'notification.notFound',
  'performance.staffOnly',
  'performance.userNotFound',
  'performance.viewForbidden',
  'settings.invalidStoredValue',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

const CODES = new Set<string>(ERROR_CODES);

export function isErrorCode(value: unknown): value is ErrorCode {
  return typeof value === 'string' && CODES.has(value);
}

/**
 * Values the reader's own wording needs — a limit, a count, a status. Numbers and short identifiers
 * only: **never a name, an e-mail address, a file name or anything else belonging to a client.**
 */
export type ErrorDetails = Record<string, string | number>;

/** What every failing response carries. `code` is one of the above unless an old client is talking. */
export interface ApiErrorBody {
  statusCode: number;
  code: string;
  message: string;
  error: string;
  timestamp: string;
  path: string;
  details?: unknown;
}
