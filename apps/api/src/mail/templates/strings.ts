import type { UserLocale } from '@law-firm/shared';
import type { MailTemplate } from '../mail.types';

/**
 * Every word that leaves the building, in the three languages the portal speaks.
 *
 * These live here rather than in the web app's messages/*.json because they are rendered on the
 * server, in whatever language the recipient chose, long after any browser request has finished.
 *
 * **The rule that matters:** a line here may say *that* something happened and invite the reader to
 * sign in. It may not name a case, a case number, a document, an amount, or quote a message. An
 * e-mail crosses mail servers the firm does not control; the portal is where the content stays.
 * `templates/templates.spec.ts` renders every template with poisoned data and fails if any of it
 * reaches the output, so a new template cannot quietly break this.
 */
export interface TemplateCopy {
  subject: string;
  /** Opening line after the greeting. */
  intro: string;
  /** Optional second paragraph. */
  detail?: string;
  action: string;
  /** Shown under the button, e.g. how long a link lives. */
  note?: string;
}

type Copy = Record<MailTemplate, TemplateCopy>;

const mn: Copy = {
  passwordReset: {
    subject: 'Нууц үг сэргээх',
    intro: 'Та нууц үгээ сэргээх хүсэлт илгээсэн байна.',
    detail: 'Доорх товчоор шинэ нууц үгээ тохируулна уу. Хэрэв та хүсэлт илгээгээгүй бол энэ захидлыг үл тоон өнгөрүүлж болно — таны нууц үг хэвээр хэвээр үлдэнэ.',
    action: 'Шинэ нууц үг тохируулах',
    note: 'Холбоос {hours} цаг хүчинтэй бөгөөд нэг удаа ажиллана.',
  },
  passwordChanged: {
    subject: 'Нууц үг солигдлоо',
    intro: 'Таны бүртгэлийн нууц үг саяхан солигдлоо.',
    detail: 'Хэрэв энэ та биш бол нэн даруй бидэнтэй холбогдоно уу. Нууц үг солигдоход бүх төхөөрөмжийн сесс хаагдсан.',
    action: 'Порталд нэвтрэх',
  },
  clientInvite: {
    subject: 'Харилцагчийн порталд урих',
    intro: 'Танд харилцагчийн порталын бүртгэл үүслээ. Хэргийнхээ явц, баримт, нэхэмжлэхээ эндээс харна.',
    detail: 'Доорх товчоор өөрийн нууц үгээ тохируулаад нэвтэрнэ үү.',
    action: 'Нууц үгээ тохируулах',
    note: 'Урилга {days} хоног хүчинтэй. Хугацаа дуусвал хуульчаасаа дахин урилга хүсээрэй.',
  },
  newMessage: {
    subject: 'Шинэ захидал ирлээ',
    intro: 'Танай хэрэгт шинэ захидал ирлээ.',
    detail: 'Захидлын агуулгыг зөвхөн порталд уншина — и-мэйлээр дамжуулахгүй.',
    action: 'Порталд нэвтэрч унших',
  },
  documentRequested: {
    subject: 'Танаас баримт хүсэв',
    intro: 'Хуульч танаас баримт хүслээ.',
    detail: 'Ямар баримт шаардлагатайг порталаас харж, файлаа шууд хавсаргана уу.',
    action: 'Порталд нэвтрэх',
  },
  invoiceIssued: {
    subject: 'Шинэ нэхэмжлэх',
    intro: 'Танд шинэ нэхэмжлэх үүсгэлээ.',
    detail: 'Дүн, хугацаа, төлбөрийн мэдээллийг порталаас харна.',
    action: 'Нэхэмжлэхээ харах',
  },
  testimonialPending: {
    subject: 'Шинэ сэтгэгдэл хүлээгдэж байна',
    intro: 'Харилцагч сэтгэгдэл үлдээсэн бөгөөд хянагдахыг хүлээж байна.',
    action: 'Админ самбарт нэвтрэх',
  },
  dailyDigest: {
    subject: 'Өнөөдрийн анхаарах зүйлс',
    intro: 'Өнөөдөр анхаарах зүйлсийн тоо:',
    action: 'Админ самбарт нэвтрэх',
  },
};

const en: Copy = {
  passwordReset: {
    subject: 'Reset your password',
    intro: 'You asked to reset your password.',
    detail: 'Use the button below to choose a new one. If this was not you, you can ignore this e-mail — your password stays as it is.',
    action: 'Choose a new password',
    note: 'The link is valid for {hours} hour(s) and works once.',
  },
  passwordChanged: {
    subject: 'Your password was changed',
    intro: 'The password on your account has just been changed.',
    detail: 'If this was not you, please contact us immediately. Changing the password ended the session on every device.',
    action: 'Sign in to the portal',
  },
  clientInvite: {
    subject: 'Your client portal account',
    intro: 'An account has been created for you in the client portal, where you can follow your case, your documents and your invoices.',
    detail: 'Use the button below to set your own password and sign in.',
    action: 'Set your password',
    note: 'The invitation is valid for {days} days. If it expires, ask your lawyer for a new one.',
  },
  newMessage: {
    subject: 'A new message',
    intro: 'There is a new message on your case.',
    detail: 'Messages are only ever read in the portal — they are never sent by e-mail.',
    action: 'Sign in to read it',
  },
  documentRequested: {
    subject: 'A document has been requested',
    intro: 'Your lawyer has asked you for a document.',
    detail: 'The portal shows which document is needed and lets you attach the file directly.',
    action: 'Sign in to the portal',
  },
  invoiceIssued: {
    subject: 'A new invoice',
    intro: 'A new invoice has been issued to you.',
    detail: 'The amount, the due date and the payment details are in the portal.',
    action: 'View your invoice',
  },
  testimonialPending: {
    subject: 'A testimonial is waiting for review',
    intro: 'A client has left a testimonial and it is waiting to be reviewed.',
    action: 'Open the admin panel',
  },
  dailyDigest: {
    subject: 'What needs attention today',
    intro: 'What needs your attention today:',
    action: 'Open the admin panel',
  },
};

const zh: Copy = {
  passwordReset: {
    subject: '重置密码',
    intro: '您提交了重置密码的请求。',
    detail: '请点击下方按钮设置新密码。若这并非您本人操作，可忽略此邮件，您的密码不会改变。',
    action: '设置新密码',
    note: '链接 {hours} 小时内有效，且仅可使用一次。',
  },
  passwordChanged: {
    subject: '密码已修改',
    intro: '您账户的密码刚刚被修改。',
    detail: '若这并非您本人操作，请立即与我们联系。修改密码后，所有设备上的会话均已结束。',
    action: '登录门户',
  },
  clientInvite: {
    subject: '客户门户账户',
    intro: '我们已为您创建客户门户账户，您可在此查看案件进展、材料与账单。',
    detail: '请点击下方按钮设置您的密码并登录。',
    action: '设置密码',
    note: '邀请 {days} 天内有效。若已过期，请向您的律师索取新邀请。',
  },
  newMessage: {
    subject: '新消息',
    intro: '您的案件收到一条新消息。',
    detail: '消息内容仅在门户中查看，不会通过邮件发送。',
    action: '登录查看',
  },
  documentRequested: {
    subject: '需要提交材料',
    intro: '律师向您索取材料。',
    detail: '请在门户中查看所需材料并直接上传文件。',
    action: '登录门户',
  },
  invoiceIssued: {
    subject: '新账单',
    intro: '已为您开具新账单。',
    detail: '金额、期限及付款信息请在门户中查看。',
    action: '查看账单',
  },
  testimonialPending: {
    subject: '有评价待审核',
    intro: '一位客户留下了评价，正在等待审核。',
    action: '打开管理后台',
  },
  dailyDigest: {
    subject: '今日需要关注的事项',
    intro: '今日需要您关注的事项：',
    action: '打开管理后台',
  },
};

export const TEMPLATE_COPY: Record<UserLocale, Copy> = { mn, en, zh };

/** Shared chrome: greeting, the line that explains why no detail is in the e-mail, and the sign-off. */
export const SHELL = {
  mn: {
    greeting: (name: string) => `Сайн байна уу, ${name}`,
    greetingAnonymous: 'Сайн байна уу',
    privacy: 'Нууцлалын үүднээс энэ захидалд хэргийн мэдээлэл агуулаагүй болно. Дэлгэрэнгүйг зөвхөн порталаас харна.',
    automated: 'Энэ захидал автоматаар илгээгдсэн тул хариу бичих шаардлагагүй.',
    digest: { tasks: 'Даалгавар', invoices: 'Нэхэмжлэх', documentRequests: 'Баримтын хүсэлт' },
  },
  en: {
    greeting: (name: string) => `Hello ${name}`,
    greetingAnonymous: 'Hello',
    privacy: 'For confidentiality, this e-mail carries no case details. Everything is in the portal.',
    automated: 'This message was sent automatically; there is no need to reply to it.',
    digest: { tasks: 'Tasks', invoices: 'Invoices', documentRequests: 'Document requests' },
  },
  zh: {
    greeting: (name: string) => `您好，${name}`,
    greetingAnonymous: '您好',
    privacy: '出于保密考虑，本邮件不含案件信息，详情请登录门户查看。',
    automated: '本邮件为系统自动发送，无需回复。',
    digest: { tasks: '任务', invoices: '账单', documentRequests: '材料申请' },
  },
} as const satisfies Record<UserLocale, unknown>;
