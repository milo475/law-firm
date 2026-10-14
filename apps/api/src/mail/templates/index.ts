import type { UserLocale } from '@law-firm/shared';
import type { MailTemplate, MailTemplateData } from '../mail.types';
import { SHELL, TEMPLATE_COPY } from './strings';

/** Straight from the web app's brand constants; an e-mail cannot read CSS variables. */
const BRAND = {
  navy: '#0f2a44',
  gold: '#c9a227',
  surface: '#ffffff',
  text: '#16202b',
  muted: '#5b6b7b',
  border: '#dfe5ea',
  page: '#eef1f4',
} as const;

export interface MailBrand {
  /** Absolute URL of the logo — an e-mail client cannot resolve a relative path. */
  logoUrl: string;
  firmName: string;
  firmAddress: string;
  firmPhone: string;
}

export interface RenderedMail {
  subject: string;
  html: string;
  text: string;
}

const escape = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const fill = (text: string, values: Record<string, string | number>): string =>
  text.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match));

/** The reader's own name is the only personal thing an e-mail carries. */
const greeting = (locale: UserLocale, name: string): string =>
  name.trim() ? SHELL[locale].greeting(name.trim()) : SHELL[locale].greetingAnonymous;

interface Body {
  greeting: string;
  paragraphs: string[];
  action: { label: string; url: string };
  note?: string;
  /** Label / value pairs of plain numbers (the digest); never names. */
  counts?: { label: string; value: number }[];
}

/**
 * One HTML shell for every template: a navy header with the logo, a white card, a footer with the
 * firm's own contact details. Inline styles only — Gmail drops <style> blocks — plus a colour-scheme
 * hint and explicit colours on every block, so a client that renders dark keeps the text readable
 * instead of inverting a half-styled page.
 */
function html(locale: UserLocale, brand: MailBrand, body: Body): string {
  const shell = SHELL[locale];
  const counts = (body.counts ?? [])
    .map(
      (row) => `
            <tr>
              <td style="padding:6px 0;color:${BRAND.muted};font-size:15px;">${escape(row.label)}</td>
              <td align="right" style="padding:6px 0;color:${BRAND.text};font-size:15px;font-weight:700;">${row.value}</td>
            </tr>`,
    )
    .join('');

  return `<!doctype html>
<html lang="${locale}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light dark" />
    <meta name="supported-color-schemes" content="light dark" />
    <title>${escape(brand.firmName)}</title>
  </head>
  <body style="margin:0;padding:0;background:${BRAND.page};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.page};padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${BRAND.surface};border-radius:12px;overflow:hidden;border:1px solid ${BRAND.border};">
            <tr>
              <td style="background:${BRAND.navy};padding:22px 28px;">
                <img src="${escape(brand.logoUrl)}" alt="${escape(brand.firmName)}" width="150" style="display:block;border:0;max-width:150px;height:auto;" />
              </td>
            </tr>
            <tr>
              <td style="padding:28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
                <p style="margin:0 0 16px;font-size:17px;font-weight:700;color:${BRAND.text};">${escape(body.greeting)}</p>
                ${body.paragraphs.map((text) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:${BRAND.text};">${escape(text)}</p>`).join('\n                ')}
                ${counts ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 18px;border-top:1px solid ${BRAND.border};border-bottom:1px solid ${BRAND.border};">${counts}
                </table>` : ''}
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 18px;">
                  <tr>
                    <td style="background:${BRAND.navy};border-radius:8px;">
                      <a href="${escape(body.action.url)}" style="display:inline-block;padding:13px 26px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;">${escape(body.action.label)}</a>
                    </td>
                  </tr>
                </table>
                ${body.note ? `<p style="margin:0 0 14px;font-size:13px;line-height:1.6;color:${BRAND.muted};">${escape(body.note)}</p>` : ''}
                <p style="margin:0 0 6px;font-size:13px;line-height:1.6;color:${BRAND.muted};">${escape(shell.privacy)}</p>
                <p style="margin:0;font-size:13px;line-height:1.6;color:${BRAND.muted};">${escape(shell.automated)}</p>
              </td>
            </tr>
            <tr>
              <td style="background:${BRAND.navy};padding:18px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
                <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#ffffff;">${escape(brand.firmName)}</p>
                <p style="margin:0;font-size:13px;line-height:1.6;color:#b8c4d0;">${escape(brand.firmAddress)}<br />${escape(brand.firmPhone)}</p>
                <p style="margin:10px 0 0;font-size:1px;line-height:1px;color:${BRAND.gold};">&nbsp;</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/** The same message for clients that show plain text, and for anyone reading the log of what was sent. */
function text(locale: UserLocale, brand: MailBrand, body: Body): string {
  const shell = SHELL[locale];
  const lines = [body.greeting, '', ...body.paragraphs];
  if (body.counts?.length) {
    lines.push('', ...body.counts.map((row) => `  ${row.label}: ${row.value}`));
  }
  lines.push('', `${body.action.label}: ${body.action.url}`);
  if (body.note) lines.push('', body.note);
  lines.push('', shell.privacy, shell.automated, '', brand.firmName, brand.firmAddress, brand.firmPhone);
  return lines.join('\n');
}

/**
 * Builds one e-mail. Every branch below hands the shell a name, a URL and plain numbers — nothing
 * that could identify a case. See the rule in `strings.ts`.
 */
export function renderMail<T extends MailTemplate>(
  template: T,
  locale: UserLocale,
  data: MailTemplateData[T],
  brand: MailBrand,
): RenderedMail {
  const copy = TEMPLATE_COPY[locale][template];
  const shell = SHELL[locale];
  const values = data as MailTemplateData[MailTemplate];

  const body: Body = {
    greeting: greeting(locale, values.name),
    paragraphs: [copy.intro, ...(copy.detail ? [copy.detail] : [])],
    action: { label: copy.action, url: values.url },
    ...(copy.note ? { note: fill(copy.note, values as unknown as Record<string, string | number>) } : {}),
  };

  if (template === 'dailyDigest') {
    const digest = data as MailTemplateData['dailyDigest'];
    body.counts = [
      { label: shell.digest.tasks, value: digest.tasks },
      { label: shell.digest.invoices, value: digest.invoices },
      { label: shell.digest.documentRequests, value: digest.documentRequests },
    ];
  }

  return {
    subject: `${copy.subject} · ${brand.firmName}`,
    html: html(locale, brand, body),
    text: text(locale, brand, body),
  };
}

export { TEMPLATE_COPY };
