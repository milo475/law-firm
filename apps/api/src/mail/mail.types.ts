import type { UserLocale } from '@law-firm/shared';

/**
 * What the firm sends. The data each template takes is deliberately thin — see `templates/`:
 * an e-mail says that something happened and where to read it, never what it said.
 */
export interface MailTemplateData {
  /** A one-time link back to the portal to choose a new password. */
  passwordReset: { name: string; url: string; hours: number };
  /** Sent after the password actually changed, so a stolen account is noticed. */
  passwordChanged: { name: string; url: string };
  /** A new account: the link lets the person set their own password. */
  clientInvite: { name: string; url: string; days: number };
  newMessage: { name: string; url: string };
  documentRequested: { name: string; url: string };
  invoiceIssued: { name: string; url: string };
  testimonialPending: { name: string; url: string };
  /** Morning summary for staff: counts only, no case or client names. */
  dailyDigest: { name: string; url: string; tasks: number; invoices: number; documentRequests: number };
}

export type MailTemplate = keyof MailTemplateData;

/**
 * Sent whatever the recipient's notification preference says: these are the e-mails without which
 * the account cannot be used or a break-in goes unnoticed.
 */
export const TRANSACTIONAL_TEMPLATES: readonly MailTemplate[] = ['passwordReset', 'passwordChanged', 'clientInvite'];

export interface MailMessage<T extends MailTemplate = MailTemplate> {
  to: string;
  template: T;
  locale: UserLocale;
  data: MailTemplateData[T];
  /** Whose account this concerns — stored on the log row, and used to honour their preference. */
  userId?: string;
}

export interface SentMail {
  from: string;
  to: string;
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
}

/** The one thing the service needs from nodemailer; a test provides its own. */
export interface MailTransport {
  send(mail: SentMail): Promise<void>;
}

export const MAIL_TRANSPORT = 'MAIL_TRANSPORT';

export interface MailResult {
  status: 'SENT' | 'FAILED' | 'SKIPPED';
  attempts: number;
  error?: string;
}
