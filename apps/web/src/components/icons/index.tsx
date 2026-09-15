/**
 * Icons exported from Figma "00 Design System" — path data copied verbatim from the exported SVGs.
 * Strokes use `currentColor` so state colours (default / hover / active) come from the parent.
 */
import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

function base({ size, className, ...rest }: IconProps, w: number, h: number) {
  return { width: size ?? w, height: size ? (size * h) / w : h, className, 'aria-hidden': true, focusable: false, ...rest };
}

// ── 20×20 nav icons (Figma: Portal sidebar / Sidebar nav item) ──────────────
export const HomeIcon = (p: IconProps) => (
  <svg viewBox="0 0 20 20" {...base(p, 20, 20)}><path {...stroke} d="M2 9.5L10 2.5L18 9.5M4 8.5V17.5H16V8.5" /></svg>
);
export const CasesIcon = (p: IconProps) => (
  <svg viewBox="0 0 20 20" {...base(p, 20, 20)}><path {...stroke} d="M8 4.5H2V15.5H18V7.5H10L8 4.5Z" /></svg>
);
export const DocumentsIcon = (p: IconProps) => (
  <svg viewBox="0 0 20 20" {...base(p, 20, 20)}><path {...stroke} d="M16 6L12 2H4V18H16V6ZM12 2V6H16" /></svg>
);
export const InvoicesIcon = (p: IconProps) => (
  <svg viewBox="0 0 20 20" {...base(p, 20, 20)}><path {...stroke} d="M7 7H13M7 11H13M4 2H16V18L13 16L10 18L7 16L4 18V2Z" /></svg>
);
export const MessagesIcon = (p: IconProps) => (
  <svg viewBox="0 0 20 20" {...base(p, 20, 20)}><path {...stroke} d="M18 3H2V13H7V17L11 13H18V3Z" /></svg>
);
export const BellIcon = (p: IconProps) => (
  <svg viewBox="0 0 20 20" {...base(p, 20, 20)}><path {...stroke} d="M5 14V8C5 5 7 3 10 3C13 3 15 5 15 8V14M3 14H17M8 17H12" /></svg>
);
export const ProfileIcon = (p: IconProps) => (
  <svg viewBox="0 0 20 20" {...base(p, 20, 20)}>
    <path {...stroke} d="M3 17.5C3 13.5 6 11.5 10 11.5C14 11.5 17 13.5 17 17.5M14 6.5C14 8.7 12.2 10.5 10 10.5C7.8 10.5 6 8.7 6 6.5C6 4.3 7.8 2.5 10 2.5C12.2 2.5 14 4.3 14 6.5Z" />
  </svg>
);
export const LogoutIcon = (p: IconProps) => (
  <svg viewBox="0 0 20 20" {...base(p, 20, 20)}><path {...stroke} d="M8.5 3H3.5V17H8.5M12.5 14L16.5 10L12.5 6M16.5 10H7.5" /></svg>
);

// ── 24×22 bottom tab bar icons (Figma: Bottom tab bar) ───────────────────────
export const TabHomeIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 22" {...base(p, 24, 22)}><path {...stroke} d="M4 10.5L12 3.5L20 10.5M6 9.5V18.5H18V9.5" /></svg>
);
export const TabCasesIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 22" {...base(p, 24, 22)}><path {...stroke} d="M10 5.5H4V16.5H20V8.5H12L10 5.5Z" /></svg>
);
export const TabDocumentsIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 22" {...base(p, 24, 22)}><path {...stroke} d="M18 7L14 3H6V19H18V7ZM14 3V7H18" /></svg>
);
export const TabMessagesIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 22" {...base(p, 24, 22)}><path {...stroke} d="M20 4H4V14H9V18L13 14H20V4Z" /></svg>
);
export const TabProfileIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 22" {...base(p, 24, 22)}>
    <path {...stroke} d="M5 18.5C5 14.5 8 12.5 12 12.5C16 12.5 19 14.5 19 18.5M16 7.5C16 9.7 14.2 11.5 12 11.5C9.8 11.5 8 9.7 8 7.5C8 5.3 9.8 3.5 12 3.5C14.2 3.5 16 5.3 16 7.5Z" />
  </svg>
);

// ── 44×44 header actions (Figma: Nav header, Nav header mobile, Modal, Toast) ─
export const MenuIcon = (p: IconProps) => (
  <svg viewBox="0 0 44 44" {...base(p, 44, 44)}><path {...stroke} strokeWidth={2} d="M13 16H31M13 22H31M13 28H31" /></svg>
);
export const BackIcon = (p: IconProps) => (
  <svg viewBox="0 0 44 44" {...base(p, 44, 44)}><path {...stroke} strokeWidth={2} d="M25.5 15L18.5 22L25.5 29" /></svg>
);
export const NotificationsIcon = (p: IconProps) => (
  <svg viewBox="0 0 44 44" {...base(p, 44, 44)}><path {...stroke} d="M17 26V20C17 17 19 15 22 15C25 15 27 17 27 20V26M15 26H29M20 29H24" /></svg>
);
export const CloseIcon = (p: IconProps) => (
  <svg viewBox="0 0 44 44" {...base(p, 44, 44)}><path {...stroke} d="M17 17L27 27M27 17L17 27" /></svg>
);
export const SearchIcon = (p: IconProps) => (
  <svg viewBox="0 0 17.1 17.1" {...base(p, 17.1, 17.1)}>
    <path {...stroke} d="M11.3 11.3L16.3 16.3M12.8 6.8C12.8 10.11 10.11 12.8 6.8 12.8C3.49 12.8 0.8 10.11 0.8 6.8C0.8 3.49 3.49 0.8 6.8 0.8C10.11 0.8 12.8 3.49 12.8 6.8Z" />
  </svg>
);

// ── small glyphs ─────────────────────────────────────────────────────────────
export const ChevronDownIcon = (p: IconProps) => (
  <svg viewBox="0 0 11.6 6.6" {...base(p, 11.6, 6.6)}><path {...stroke} d="M0.8 0.8L5.8 5.8L10.8 0.8" /></svg>
);
export const ChevronRightIcon = (p: IconProps) => (
  <svg viewBox="0 0 5.5 9.5" {...base(p, 5.5, 9.5)}><path {...stroke} strokeWidth={1.5} d="M0.75 0.75L4.75 4.75L0.75 8.75" /></svg>
);
export const ArrowRightIcon = (p: IconProps) => (
  <svg viewBox="0 0 13.9 9.6" {...base(p, 13.9, 9.6)}><path {...stroke} strokeLinejoin="miter" d="M0.8 4.8H12.8M8.8 8.8L12.8 4.8L8.8 0.8" /></svg>
);
export const CheckIcon = (p: IconProps) => (
  <svg viewBox="0 0 12 24" {...base(p, 12, 24)}><path {...stroke} strokeWidth={2} d="M0 12L4 16L12 8" /></svg>
);
// Portal auth brand panel "Check" (Figma 28:47) — 22px gold-500 disc + navy-900 tick
export const CheckCircleIcon = (p: IconProps) => (
  <svg viewBox="0 0 22 22" {...base(p, 22, 22)}>
    <path d="M0 11C0 4.92487 4.92487 0 11 0V0C17.0751 0 22 4.92487 22 11V11C22 17.0751 17.0751 22 11 22V22C4.92487 22 0 17.0751 0 11V11Z" fill="var(--gold-500)" />
    <path {...stroke} strokeWidth={2} stroke="var(--navy-900)" d="M6 10.75L9.5 14.25L16 7.75" />
  </svg>
);
// Inline "back" chevron used by auth-card back links (Figma 28:126) — 8×14, 2px stroke
export const BackChevronIcon = (p: IconProps) => (
  <svg viewBox="0 0 8 14" {...base(p, 8, 14)}><path {...stroke} strokeWidth={2} d="M7 1L1 7L7 13" /></svg>
);

// ── Article share glyphs (Figma: Public / 08 Article Detail — "Share button", 44×44 tile drawn by the page) ──
export const ShareSquareIcon = (p: IconProps) => (
  <svg viewBox="0 0 44 44" {...base(p, 44, 44)}><path {...stroke} d="M28 16H16V28H28V16Z" /></svg>
);
export const SharePlusIcon = (p: IconProps) => (
  <svg viewBox="0 0 44 44" {...base(p, 44, 44)}><path {...stroke} d="M22 15V29M15 22H29" /></svg>
);
export const ShareArrowIcon = (p: IconProps) => (
  <svg viewBox="0 0 44 44" {...base(p, 44, 44)}><path {...stroke} d="M17 22H27M23 26L27 22L23 18" /></svg>
);

// ── Service card icon (Figma: Card / Type=Service) — scales of justice on gold-100 tile ──
export const ScalesIcon = (p: IconProps) => (
  <svg viewBox="0 0 56 56" {...base(p, 56, 56)}>
    <path d="M0 8C0 3.58172 3.58172 0 8 0H48C52.4183 0 56 3.58172 56 8V48C56 52.4183 52.4183 56 48 56H8C3.58172 56 0 52.4183 0 48V8Z" fill="var(--gold-100)" />
    <path {...stroke} stroke="var(--gold-700)" d="M28 18V38M20 23H36M20 23L17 31H23L20 23ZM36 23L33 31H39L36 23ZM23 38H33" />
  </svg>
);

// ── Dashboard stat tiles (Figma: Portal / 03 Dashboard / Desktop — "Stat card" Icon, 40×40) ──
const statTile = 'M0 8C0 3.58172 3.58172 0 8 0H32C36.4183 0 40 3.58172 40 8V32C40 36.4183 36.4183 40 32 40H8C3.58172 40 0 36.4183 0 32V8Z';
export const StatCasesIcon = (p: IconProps) => (
  <svg viewBox="0 0 40 40" {...base(p, 40, 40)}><path d={statTile} fill="var(--status-new-bg)" /><path {...stroke} stroke="var(--status-new-fg)" d="M18 14.5H12V25.5H28V17.5H20L18 14.5Z" /></svg>
);
export const StatNotificationsIcon = (p: IconProps) => (
  <svg viewBox="0 0 40 40" {...base(p, 40, 40)}><path d={statTile} fill="var(--status-pending-bg)" /><path {...stroke} stroke="var(--status-pending-fg)" d="M15 24V18C15 15 17 13 20 13C23 13 25 15 25 18V24M13 24H27M18 27H22" /></svg>
);
export const StatInvoiceIcon = (p: IconProps) => (
  <svg viewBox="0 0 40 40" {...base(p, 40, 40)}><path d={statTile} fill="var(--status-danger-bg)" /><path {...stroke} stroke="var(--status-danger-fg)" d="M17 17H23M17 21H23M14 12H26V28L23 26L20 28L17 26L14 28V12Z" /></svg>
);
export const StatClockIcon = (p: IconProps) => (
  <svg viewBox="0 0 40 40" {...base(p, 40, 40)}><path d={statTile} fill="var(--status-progress-bg)" /><path {...stroke} stroke="var(--status-progress-fg)" d="M20 15V20L23.5 22M28 20C28 24.4 24.4 28 20 28C15.6 28 12 24.4 12 20C12 15.6 15.6 12 20 12C24.4 12 28 15.6 28 20Z" /></svg>
);

// ── Toast icons (Figma: Toast) — 36px circle tile + glyph ───────────────────
const toastTile = 'M0 18C0 8.05887 8.05887 0 18 0V0C27.9411 0 36 8.05887 36 18V18C36 27.9411 27.9411 36 18 36V36C8.05887 36 0 27.9411 0 18V18Z';
export const ToastSuccessIcon = (p: IconProps) => (
  <svg viewBox="0 0 36 36" {...base(p, 36, 36)}><path d={toastTile} fill="var(--success-100)" /><path {...stroke} strokeWidth={1.8} stroke="var(--success-700)" d="M12 18L16 22L24 14" /></svg>
);
export const ToastWarningIcon = (p: IconProps) => (
  <svg viewBox="0 0 36 36" {...base(p, 36, 36)}><path d={toastTile} fill="var(--warning-100)" /><path {...stroke} strokeWidth={1.8} stroke="var(--warning-700)" d="M18 13V19M18 22.5V23" /></svg>
);
export const ToastDangerIcon = (p: IconProps) => (
  <svg viewBox="0 0 36 36" {...base(p, 36, 36)}><path d={toastTile} fill="var(--danger-100)" /><path {...stroke} strokeWidth={1.8} stroke="var(--danger-700)" d="M13 13L23 23M23 13L13 23" /></svg>
);
export const ToastInfoIcon = (p: IconProps) => (
  <svg viewBox="0 0 36 36" {...base(p, 36, 36)}><path d={toastTile} fill="var(--info-100)" /><path {...stroke} strokeWidth={1.8} stroke="var(--info-700)" d="M18 16.75V22.75M18 13.25V13.75" /></svg>
);

// ── Avatar photo placeholder (Figma: Avatar / Type=Photo) ────────────────────
export const AvatarPhotoPlaceholder = ({ size = 48, ...p }: IconProps) => (
  <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden focusable={false} {...p}>
    <circle cx="24" cy="24" r="24" fill="var(--navy-200)" />
    <circle cx="24" cy="15.84" r="8.16" fill="var(--navy-600)" />
    <path d="M8.5 41.5C10.5 32 16.5 27.5 24 27.5C31.5 27.5 37.5 32 39.5 41.5C35.5 45.5 30 48 24 48C18 48 12.5 45.5 8.5 41.5Z" fill="var(--navy-600)" />
  </svg>
);

// ── Contact page (Figma: Public / 10 Contact — "Contact info" items, 40px gold-100 tile + gold glyph) ──
const contactTile = 'M0 8C0 3.58172 3.58172 0 8 0H32C36.4183 0 40 3.58172 40 8V32C40 36.4183 36.4183 40 32 40H8C3.58172 40 0 36.4183 0 32V8Z';
export const ContactPinIcon = (p: IconProps) => (
  <svg viewBox="0 0 40 40" {...base(p, 40, 40)}>
    <path d={contactTile} fill="var(--gold-100)" />
    <path {...stroke} d="M26 18C26 22.5 20 28 20 28C20 28 14 22.5 14 18C14 14.7 16.7 12 20 12C23.3 12 26 14.7 26 18Z" />
  </svg>
);
export const ContactPhoneIcon = (p: IconProps) => (
  <svg viewBox="0 0 40 40" {...base(p, 40, 40)}>
    <path d={contactTile} fill="var(--gold-100)" />
    <path {...stroke} d="M18 13H14C13.5 13 13 13.5 13 14C13 21 19 27 26 27C26.5 27 27 26.5 27 26V22.5L23.5 21.5L22 23.5C19.5 22.5 18 21 17 18.5L19 17L18 13Z" />
  </svg>
);
export const ContactMailIcon = (p: IconProps) => (
  <svg viewBox="0 0 40 40" {...base(p, 40, 40)}>
    <path d={contactTile} fill="var(--gold-100)" />
    <path {...stroke} d="M28 15V25H12V15H28ZM12 15L20 21L28 15" />
  </svg>
);
export const ContactClockIcon = (p: IconProps) => (
  <svg viewBox="0 0 40 40" {...base(p, 40, 40)}>
    <path d={contactTile} fill="var(--gold-100)" />
    <path {...stroke} d="M20 15V20L23.5 22M28 20C28 24.4 24.4 28 20 28C15.6 28 12 24.4 12 20C12 15.6 15.6 12 20 12C24.4 12 28 15.6 28 20Z" />
  </svg>
);
// Map placeholder pin (Figma: Public / 10 Contact — "Map placeholder", 14×18, stroke 2)
export const MapPinIcon = (p: IconProps) => (
  <svg viewBox="0 0 14 18" {...base(p, 14, 18)}>
    <path {...stroke} strokeWidth={2} d="M13 7C13 11.5 7 17 7 17C7 17 1 11.5 1 7C1 3.7 3.7 1 7 1C10.3 1 13 3.7 13 7Z" />
  </svg>
);

// ── Messages composer (Figma: Portal / 08 Messages — "Attach" 48×48 desktop / 44×44 mobile, "Send" 44×44) ──
// Glyph only; the page draws the tile (surface-alt / bg-page square, brand-primary circle) as the button background.
export const AttachIcon = (p: IconProps) => (
  <svg viewBox="0 0 48 48" {...base(p, 48, 48)}><path {...stroke} d="M25.5 18.975L19 25.475C17.6 26.875 17.6 29.075 19 30.475C20.4 31.875 22.6 31.875 24 30.475L29.5 24.975C31.5 22.975 31.5 19.975 29.5 17.975C27.5 15.975 24.5 15.975 22.5 17.975L17 23.475" /></svg>
);
export const AttachSmIcon = (p: IconProps) => (
  <svg viewBox="0 0 44 44" {...base(p, 44, 44)}><path {...stroke} d="M23.5 16.975L17 23.475C15.6 24.875 15.6 27.075 17 28.475C18.4 29.875 20.6 29.875 22 28.475L27.5 22.975C29.5 20.975 29.5 17.975 27.5 15.975C25.5 13.975 22.5 13.975 20.5 15.975L15 21.475" /></svg>
);
export const SendIcon = (p: IconProps) => (
  <svg viewBox="0 0 44 44" {...base(p, 44, 44)}><path {...stroke} strokeWidth={2} d="M15 22H29M23 27L29 22L23 17" /></svg>
);

// ── Payment success (Figma: Portal / 07b Payment Success / Desktop — "Check" 96×96, status-progress disc + tick) ──
export const SuccessCheckIcon = (p: IconProps) => (
  <svg viewBox="0 0 96 96" {...base(p, 96, 96)}>
    <path d="M0 48C0 21.4903 21.4903 0 48 0V0C74.5097 0 96 21.4903 96 48V48C96 74.5097 74.5097 96 48 96V96C21.4903 96 0 74.5097 0 48V48Z" fill="var(--status-progress-bg)" />
    <path {...stroke} strokeWidth={3} stroke="var(--status-progress-fg)" d="M35 48.5L44 57.5L61 38.5" />
  </svg>
);

// ── Notification list tiles (Figma: Portal / 09 Notifications — "Icon" 40×40 desktop 33:690, 36×36 mobile 37:1223) ──
// Same glyph size on both; `compact` shrinks only the rounded tile (radius 8) and shifts the glyph by -2.
type NotifIconProps = IconProps & { compact?: boolean };
function notifIcon(tone: 'new' | 'progress' | 'pending' | 'closed', d: string) {
  const NotifIcon = ({ compact, ...p }: NotifIconProps) => {
    const s = compact ? 36 : 40;
    return (
      <svg viewBox={`0 0 ${s} ${s}`} {...base(p, s, s)}>
        <rect width={s} height={s} rx={8} fill={`var(--status-${tone}-bg)`} />
        <path {...stroke} stroke={`var(--status-${tone}-fg)`} transform={compact ? 'translate(-2 -2)' : undefined} d={d} />
      </svg>
    );
  };
  return NotifIcon;
}
/** Case progress — green folder (33:690) */
export const NotifCaseIcon = notifIcon('progress', 'M18 14.5H12V25.5H28V17.5H20L18 14.5Z');
/** New request — blue folder (33:728) */
export const NotifRequestIcon = notifIcon('new', 'M18 14.5H12V25.5H28V17.5H20L18 14.5Z');
/** Message — blue speech bubble (33:699) */
export const NotifMessageIcon = notifIcon('new', 'M28 13H12V23H17V27L21 23H28V13Z');
/** New document — green page (33:708) */
export const NotifDocumentIcon = notifIcon('progress', 'M26 16L22 12H14V28H26V16ZM22 12V16H26');
/** Invoice — gold receipt (33:720) */
export const NotifInvoiceIcon = notifIcon('pending', 'M17 17H23M17 21H23M14 12H26V28L23 26L20 28L17 26L14 28V12Z');
/** Meeting confirmed — green clock (33:739) */
export const NotifClockIcon = notifIcon('progress', 'M20 15V20L23.5 22M28 20C28 24.4 24.4 28 20 28C15.6 28 12 24.4 12 20C12 15.6 15.6 12 20 12C24.4 12 28 15.6 28 20Z');
/** Other / document downloaded — grey page (33:747) */
export const NotifGenericIcon = notifIcon('closed', 'M26 16L22 12H14V28H26V16ZM22 12V16H26');

// ── Empty / error state glyphs (Figma: Portal / 11 Empty State 34:851, 11b Error & Empty States 34:921…34:951, Mobile 37:1406) ──
// Glyph only, 40×40 box cut from the 112px illustration (viewBox origin 36,36) — identical on the 96px mobile disc.
// `data-tone` lets EmptyState tint its disc (status-*-bg) and the stroke (status-*-fg) to match.
const stateGlyph = (tone: 'new' | 'pending' | 'closed' | 'danger', d: string) => {
  const StateGlyph = (p: IconProps) => (
    <svg viewBox="36 36 40 40" data-tone={tone} {...base(p, 40, 40)}><path {...stroke} strokeWidth={2.2} d={d} /></svg>
  );
  return StateGlyph;
};
/** "Танд одоогоор хэрэг байхгүй байна" — folder on info disc */
export const EmptyCasesGlyph = stateGlyph('new', 'M48 50H64V68H48V50ZM48 50V44H58L61 50');
/** "Баримт байхгүй байна" — page on warning disc */
export const EmptyDocumentGlyph = stateGlyph('pending', 'M68 46L60 38H44V74H68V46ZM60 38V46H68');
/** "Хайлтад тохирох үр дүн олдсонгүй" — magnifier on neutral disc */
export const EmptySearchGlyph = stateGlyph('closed', 'M59 59L70 70M62 52C62 57.5 57.5 62 52 62C46.5 62 42 57.5 42 52C42 46.5 46.5 42 52 42C57.5 42 62 46.5 62 52Z');
/** "Алдаа гарлаа" — warning triangle on danger disc */
export const ErrorStateGlyph = stateGlyph('danger', 'M56 53V61M56 65V66M56 41L74 71H38L56 41Z');
/** "Сүлжээний холбоо тасарлаа" — wifi on neutral disc */
export const OfflineGlyph = stateGlyph('closed', 'M40 49.375C48 42.375 64 42.375 72 49.375M45 55.375C51 50.375 61 50.375 67 55.375M50 61.375C54 58.375 58 58.375 62 61.375M56 67.375V67.875');

// ── Documents (Figma: Portal / 06 Documents — Dropzone "Icon" 48×48 desktop / 44×44 mobile; File row "Action" 44×44) ──
// Upload: surface disc + 2px glyph (stroke follows currentColor). Render at 44px for the mobile frame.
export const UploadCircleIcon = (p: IconProps) => (
  <svg viewBox="0 0 48 48" {...base(p, 48, 48)}>
    <path d="M0 24C0 10.7452 10.7452 0 24 0V0C37.2548 0 48 10.7452 48 24V24C48 37.2548 37.2548 48 24 48V48C10.7452 48 0 37.2548 0 24V24Z" fill="var(--bg-surface)" />
    <path {...stroke} strokeWidth={2} d="M24 29V17M29 22L24 17L19 22M17 31H31" />
  </svg>
);
export const EyeIcon = (p: IconProps) => (
  <svg viewBox="0 0 44 44" {...base(p, 44, 44)}><path {...stroke} d="M22 27C26.4 27 30 22 30 22C30 22 26.4 17 22 17C17.6 17 14 22 14 22C14 22 17.6 27 22 27Z" /></svg>
);
export const DownloadIcon = (p: IconProps) => (
  <svg viewBox="0 0 44 44" {...base(p, 44, 44)}><path {...stroke} d="M22 15.5V25.5M26 21.5L22 25.5L18 21.5M15 28.5H29" /></svg>
);

// ── Admin navigation (same 20×20 / 1.6px stroke style as the portal sidebar icons) ──
export const UsersIcon = (p: IconProps) => (
  <svg viewBox="0 0 20 20" {...base(p, 20, 20)}>
    <path {...stroke} d="M1.5 17C1.5 13.8 4 12 7.5 12C11 12 13.5 13.8 13.5 17M10.5 6.5C10.5 8.2 9.2 9.5 7.5 9.5C5.8 9.5 4.5 8.2 4.5 6.5C4.5 4.8 5.8 3.5 7.5 3.5C9.2 3.5 10.5 4.8 10.5 6.5ZM13.5 3.7C14.9 4 16 5.2 16 6.6C16 8 14.9 9.2 13.5 9.5M15.5 12.4C17.3 13 18.5 14.6 18.5 17" />
  </svg>
);
export const BriefcaseIcon = (p: IconProps) => (
  <svg viewBox="0 0 20 20" {...base(p, 20, 20)}>
    <path {...stroke} d="M2 6.5H18V16.5H2V6.5ZM7 6.5V3.5H13V6.5M2 10.5H18" />
  </svg>
);
export const InboxIcon = (p: IconProps) => (
  <svg viewBox="0 0 20 20" {...base(p, 20, 20)}>
    <path {...stroke} d="M2 11L4.5 3.5H15.5L18 11V16.5H2V11ZM2 11H6.5L8 13.5H12L13.5 11H18" />
  </svg>
);
// Staff workload (admin sidebar) — bar chart on the 20×20 nav grid
export const PerformanceIcon = (p: IconProps) => (
  <svg viewBox="0 0 20 20" {...base(p, 20, 20)}>
    <path {...stroke} d="M2.5 17.5H17.5M5 14.5V10M10 14.5V4.5M15 14.5V7.5" />
  </svg>
);
// Staff tasks (admin sidebar) — checklist on the 20×20 nav grid
export const TasksIcon = (p: IconProps) => (
  <svg viewBox="0 0 20 20" {...base(p, 20, 20)}>
    <path {...stroke} d="M9 5H17M9 10H17M9 15H17M3 5L4.5 6.5L7 4M3 10L4.5 11.5L7 9M3 15L4.5 16.5L7 14" />
  </svg>
);
export const PlusIcon = (p: IconProps) => (
  <svg viewBox="0 0 20 20" {...base(p, 20, 20)}>
    <path {...stroke} strokeWidth={1.8} d="M10 4V16M4 10H16" />
  </svg>
);
