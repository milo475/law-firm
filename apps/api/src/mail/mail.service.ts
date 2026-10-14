import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { Inject, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailStatus, type UserLocale } from '@law-firm/shared';
import type { Env } from '../config/env';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { renderMail, type MailBrand } from './templates';
import {
  MAIL_TRANSPORT,
  TRANSACTIONAL_TEMPLATES,
  type MailMessage,
  type MailResult,
  type MailTemplate,
  type MailTemplateData,
  type MailTransport,
} from './mail.types';

/** The templates that only ever say "there is something new": name, link and plain numbers. */
type NotificationTemplate = 'newMessage' | 'documentRequested' | 'invoiceIssued' | 'testimonialPending' | 'dailyDigest';

/** Three attempts, backing off 1s → 5s → 25s. Tests do not wait. */
const RETRY_DELAYS_MS = [1_000, 5_000, 25_000];

/** The firm's details change rarely; re-reading them for every e-mail would be a query per send. */
const BRAND_TTL_MS = 60_000;

/**
 * The one way out of the building for e-mail.
 *
 * Switched off unless SMTP is configured: with no host or user every send is logged as SKIPPED and
 * nothing leaves, which is what local development and the test suite run with. Nothing throws —
 * a failed e-mail must never fail the request that triggered it, so callers use `enqueue()` and the
 * delivery (including the retries) happens after the HTTP response has gone.
 */
@Injectable()
export class MailService implements OnApplicationBootstrap {
  private readonly logger = new Logger(MailService.name);
  private brandCache: { value: MailBrand; at: number } | null = null;

  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    @Optional() @Inject(MAIL_TRANSPORT) private readonly transport: MailTransport | null,
  ) {}

  onApplicationBootstrap(): void {
    if (!this.enabled) {
      this.logger.warn('E-mail is off (SMTP_HOST / SMTP_USER not set) — messages will be logged as SKIPPED');
      return;
    }
    const user = this.config.get('SMTP_USER', { infer: true });
    const host = this.config.get('SMTP_HOST', { infer: true });
    const from = this.from();
    // Gmail rejects, or silently rewrites, a From: that is not the authenticated mailbox.
    if (/gmail|google/i.test(host) && !from.toLowerCase().includes(user.toLowerCase())) {
      this.logger.warn(`MAIL_FROM (${from}) does not contain SMTP_USER (${user}); Gmail may reject or rewrite it`);
    }
    this.logger.log(`E-mail enabled via ${host} as ${user}`);
  }

  /** Whether anything can actually be sent. */
  get enabled(): boolean {
    return Boolean(this.config.get('SMTP_HOST', { infer: true }) && this.config.get('SMTP_USER', { infer: true }));
  }

  /**
   * Hands the message to the background and returns at once — the caller is usually inside a request
   * and must not wait for a mail server. Failures are logged, never thrown.
   */
  enqueue(message: MailMessage): void {
    setImmediate(() => {
      void this.send(message).catch((error: unknown) => {
        this.logger.error(`Unexpected mail failure (${message.template}): ${(error as Error).message}`);
      });
    });
  }

  /**
   * Renders and delivers one message, retrying a failing transport, and records the outcome in
   * EmailLog. Awaiting this is only for tests and for jobs that are already running in the background.
   */
  async send(message: MailMessage): Promise<MailResult> {
    const { to, template, locale } = message;

    if (!this.enabled || !this.transport) {
      return this.record(message, { status: 'SKIPPED', attempts: 0, error: 'mail disabled' });
    }
    if (!(await this.wants(message))) {
      return this.record(message, { status: 'SKIPPED', attempts: 0, error: 'notifications off' });
    }

    const rendered = renderMail(template, locale, message.data, await this.brand());
    const mail = {
      from: this.from(),
      to,
      ...(this.config.get('MAIL_REPLY_TO', { infer: true }) ? { replyTo: this.config.get('MAIL_REPLY_TO', { infer: true }) } : {}),
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    };

    let lastError = '';
    for (let attempt = 1; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
      try {
        await this.transport.send(mail);
        return this.record(message, { status: 'SENT', attempts: attempt });
      } catch (error) {
        lastError = (error as Error).message;
        this.logger.warn(`Attempt ${attempt}/${RETRY_DELAYS_MS.length} to send "${template}" failed: ${lastError}`);
        if (attempt < RETRY_DELAYS_MS.length) await this.wait(RETRY_DELAYS_MS[attempt - 1]);
      }
    }
    this.logger.error(`Giving up on "${template}" after ${RETRY_DELAYS_MS.length} attempts: ${lastError}`);
    return this.record(message, { status: 'FAILED', attempts: RETRY_DELAYS_MS.length, error: lastError });
  }

  /**
   * The ordinary "something happened, sign in to see it" notice. Loads the recipient, writes in the
   * language they chose and links straight at the page that holds the detail — which is the only
   * place the detail ever appears.
   */
  async notify<T extends NotificationTemplate>(
    userId: string,
    template: T,
    path: string,
    extra?: Omit<MailTemplateData[T], 'name' | 'url'>,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, firstName: true, preferredLocale: true, isActive: true },
    });
    if (!user || !user.isActive) return;
    const locale: UserLocale = user.preferredLocale === 'en' || user.preferredLocale === 'zh' ? user.preferredLocale : 'mn';
    this.enqueue({
      to: user.email,
      template,
      locale,
      userId,
      data: { name: user.firstName, url: this.url(path, locale), ...(extra ?? {}) } as MailTemplateData[T],
    });
  }

  /** The admin panel is Mongolian only, so only portal links carry a language prefix. */
  url(path: string, locale: UserLocale): string {
    const prefix = locale !== 'mn' && path.startsWith('/portal') ? `/${locale}` : '';
    return `${this.appUrl()}${prefix}${path}`;
  }

  /** Most recent first — the admin settings page shows these so a silent outage is noticed. */
  recentLog(limit = 50) {
    return this.prisma.emailLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { id: true, to: true, template: true, locale: true, status: true, error: true, attempts: true, createdAt: true, sentAt: true },
    });
  }

  // ─── internals ─────────────────────────────────────────────────────────────

  /** Notification e-mails honour the recipient's preference; the transactional ones never do. */
  private async wants({ template, userId }: MailMessage): Promise<boolean> {
    if (TRANSACTIONAL_TEMPLATES.includes(template) || !userId) return true;
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { emailNotifications: true } });
    return user?.emailNotifications !== false;
  }

  private from(): string {
    return this.config.get('MAIL_FROM', { infer: true }) || this.config.get('SMTP_USER', { infer: true });
  }

  private wait(ms: number): Promise<void> {
    // The suite would otherwise spend half a minute asleep proving the backoff works.
    if (this.config.get('NODE_ENV', { infer: true }) === 'test') return Promise.resolve();
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async brand(): Promise<MailBrand> {
    if (this.brandCache && Date.now() - this.brandCache.at < BRAND_TTL_MS) return this.brandCache.value;
    const firm = await this.settings.getFirm();
    const value: MailBrand = {
      logoUrl: `${this.appUrl()}/brand/logo.png`,
      firmName: firm.name,
      firmAddress: firm.address,
      firmPhone: firm.phone,
    };
    this.brandCache = { value, at: Date.now() };
    return value;
  }

  /** Where the links point: APP_URL when set, otherwise the first browser origin we accept. */
  appUrl(): string {
    const configured = this.config.get('APP_URL', { infer: true });
    if (configured) return configured;
    return this.config.get('CORS_ORIGIN', { infer: true }).split(',')[0].trim().replace(/\/+$/, '');
  }

  /** What was sent, to whom and whether it arrived. Never the body — there is nothing in it worth keeping. */
  private async record(message: MailMessage, result: MailResult): Promise<MailResult> {
    try {
      await this.prisma.emailLog.create({
        data: {
          to: message.to,
          template: message.template,
          locale: message.locale,
          status: result.status as EmailStatus,
          error: result.error ?? null,
          attempts: result.attempts,
          relatedUserId: message.userId ?? null,
          sentAt: result.status === 'SENT' ? new Date() : null,
        },
      });
    } catch (error) {
      this.logger.error(`Could not write the e-mail log: ${(error as Error).message}`);
    }
    if (result.status === 'SKIPPED') {
      this.logger.warn(`E-mail "${message.template}" not sent (${result.error}) to ${mask(message.to)}`);
    }
    return result;
  }
}

/** Addresses are masked in logs; the log file is not the place for a client's e-mail. */
function mask(address: string): string {
  const [name, domain] = address.split('@');
  if (!domain) return '***';
  return `${name.slice(0, 2)}***@${domain}`;
}

export type { MailMessage, MailResult, MailTemplate, UserLocale };
