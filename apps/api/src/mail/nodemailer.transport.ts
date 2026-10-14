import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { createTransport } from 'nodemailer';
import type { Env } from '../config/env';
import type { MailTransport, SentMail } from './mail.types';

/**
 * The real transport, built once at start-up. Returns null when SMTP is not configured, which is
 * how local development and the test suite run: the service then logs every message as SKIPPED.
 */
export function createNodemailerTransport(config: ConfigService<Env, true>): MailTransport | null {
  const host = config.get('SMTP_HOST', { infer: true });
  const user = config.get('SMTP_USER', { infer: true });
  if (!host || !user) return null;

  const logger = new Logger('MailTransport');
  const transporter = createTransport({
    host,
    port: config.get('SMTP_PORT', { infer: true }),
    secure: config.get('SMTP_SECURE', { infer: true }),
    auth: { user, pass: config.get('SMTP_PASS', { infer: true }) },
  });

  return {
    async send(mail: SentMail): Promise<void> {
      const info = await transporter.sendMail(mail);
      logger.debug(`Accepted by ${host}: ${info.messageId}`);
    },
  };
}
