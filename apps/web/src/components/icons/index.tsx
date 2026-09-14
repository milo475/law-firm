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

// ── Service card icon (Figma: Card / Type=Service) — scales of justice on gold-100 tile ──
export const ScalesIcon = (p: IconProps) => (
  <svg viewBox="0 0 56 56" {...base(p, 56, 56)}>
    <path d="M0 8C0 3.58172 3.58172 0 8 0H48C52.4183 0 56 3.58172 56 8V48C56 52.4183 52.4183 56 48 56H8C3.58172 56 0 52.4183 0 48V8Z" fill="var(--gold-100)" />
    <path {...stroke} stroke="var(--gold-700)" d="M28 18V38M20 23H36M20 23L17 31H23L20 23ZM36 23L33 31H39L36 23ZM23 38H33" />
  </svg>
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
