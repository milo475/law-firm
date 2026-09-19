/**
 * Responsive audit: every page at every width we support, looking for the things that actually
 * break a layout — the page scrolling sideways, an element running past the right edge, text
 * clipped mid-word, and tap targets too small to hit on a phone.
 *
 * Run with the app served from a production build:
 *   node device-audit.mjs                    # all surfaces
 *   node device-audit.mjs public             # one group
 */
import { chromium } from '@playwright/test';

const BASE = process.env.AUDIT_URL ?? 'http://localhost:3001';
const API = process.env.AUDIT_API ?? 'http://localhost:4000';

/** Real device widths: the smallest phone still in use, through to a wide desktop. */
const WIDTHS = [
  { w: 320, name: '320 (iPhone SE1)', phone: true },
  { w: 360, name: '360 (Android)', phone: true },
  { w: 390, name: '390 (iPhone 14)', phone: true },
  { w: 430, name: '430 (Pro Max)', phone: true },
  { w: 768, name: '768 (iPad)', phone: false },
  { w: 1024, name: '1024 (iPad ls)', phone: false },
  { w: 1280, name: '1280 (laptop)', phone: false },
  { w: 1440, name: '1440 (desktop)', phone: false },
  { w: 1920, name: '1920 (wide)', phone: false },
];

const PUBLIC_PAGES = [
  ['home', '/'],
  ['about', '/about'],
  ['services', '/services'],
  ['service-detail', '/services/civil'],
  ['lawyers', '/lawyers'],
  ['lawyers-filtered', '/lawyers?spec=civil'],
  ['news', '/news'],
  ['reviews', '/reviews'],
  ['faq', '/faq'],
  ['contact', '/contact'],
  ['privacy', '/privacy'],
  ['terms', '/terms'],
  ['not-found', '/this-page-does-not-exist'],
  ['login', '/portal/login'],
  ['register', '/portal/register'],
  ['forgot', '/portal/forgot-password'],
  ['en-home', '/en'],
  ['zh-home', '/zh'],
  ['en-reviews', '/en/reviews'],
];

const PORTAL_PAGES = [
  ['portal-dashboard', '/portal'],
  ['portal-cases', '/portal/cases'],
  ['portal-documents', '/portal/documents'],
  ['portal-invoices', '/portal/invoices'],
  ['portal-messages', '/portal/messages'],
  ['portal-requests', '/portal/requests'],
  ['portal-request-new', '/portal/requests/new'],
  ['portal-notifications', '/portal/notifications'],
  ['portal-profile', '/portal/profile'],
];

const ADMIN_PAGES = [
  ['admin-dashboard', '/admin'],
  ['admin-cases', '/admin/cases'],
  ['admin-case-new', '/admin/cases/new'],
  ['admin-clients', '/admin/clients'],
  ['admin-lawyers', '/admin/lawyers'],
  ['admin-posts', '/admin/posts'],
  ['admin-post-new', '/admin/posts/new'],
  ['admin-invoices', '/admin/invoices'],
  ['admin-requests', '/admin/requests'],
  ['admin-testimonials', '/admin/testimonials'],
  ['admin-tasks', '/admin/tasks'],
  ['admin-tasks-board', '/admin/tasks?view=board'],
  ['admin-performance', '/admin/performance'],
  ['admin-notifications', '/admin/notifications'],
  ['admin-settings', '/admin/settings'],
  ['admin-profile', '/admin/profile'],
];

/** Runs in the page: everything we can detect without a human looking. */
function collectIssues(isPhone) {
  const out = [];
  const docWidth = document.documentElement.clientWidth;
  const add = (type, detail, el) => {
    const tag = el
      ? `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${el.className && typeof el.className === 'string' ? `.${el.className.trim().split(/\s+/).slice(0, 3).join('.')}` : ''}`
      : '';
    out.push({ type, detail, el: tag, text: el ? (el.textContent ?? '').trim().slice(0, 40) : '' });
  };

  // 1. The page itself scrolls sideways.
  const overflow = document.documentElement.scrollWidth - docWidth;
  if (overflow > 1) add('page-scrolls-sideways', `${overflow}px`, null);

  const scrollableAncestor = (el) => {
    for (let node = el.parentElement; node && node !== document.body; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (/(auto|scroll)/.test(style.overflowX)) return true;
    }
    return false;
  };

  /** Screen-reader-only text is a 1px clipped box on purpose — never a layout problem. */
  const srOnly = (style, rect) =>
    (style.clipPath && style.clipPath !== 'none') ||
    (style.clip && style.clip !== 'auto') ||
    rect.width <= 1 ||
    rect.height <= 1;

  const visible = (el, style, rect) =>
    rect.width > 0 &&
    rect.height > 0 &&
    style.visibility !== 'hidden' &&
    style.display !== 'none' &&
    Number(style.opacity) !== 0 &&
    !srOnly(style, rect) &&
    !el.closest('[aria-hidden="true"]') &&
    !el.closest('[hidden]');

  const reported = new Set();
  for (const el of document.querySelectorAll('body *')) {
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    if (!visible(el, style, rect)) continue;

    // 2. An element past the right edge that nothing lets you scroll to.
    if (rect.right > docWidth + 1 && style.position !== 'fixed' && !scrollableAncestor(el)) {
      if (![...reported].some((parent) => parent.contains(el))) {
        reported.add(el);
        add('element-past-right-edge', `right=${Math.round(rect.right)} > ${docWidth}`, el);
      }
    }

    // 3. Text cut off inside its own box (no ellipsis, no scroll).
    const clipped = el.scrollWidth - el.clientWidth;
    if (
      clipped > 2 &&
      el.children.length === 0 &&
      (el.textContent ?? '').trim().length > 0 &&
      style.overflowX === 'hidden' &&
      style.textOverflow !== 'ellipsis'
    ) {
      add('text-clipped', `${clipped}px hidden`, el);
    }
  }

  // 4. Tap targets, on phones only. Buttons and inputs are held to the 44px guideline; a link in
  //    a list gets the looser 32px, and a link inside running text is read, not tapped.
  if (isPhone) {
    const controls = document.querySelectorAll('a[href], button, input, select, textarea, [role="button"], [role="radio"], [role="tab"], [role="switch"]');
    for (const el of controls) {
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      if (!visible(el, style, rect)) continue;
      if (el.disabled || el.getAttribute('aria-disabled') === 'true') continue;
      // A field wrapped in a label is tapped through the label, which is the real target.
      const label = el.closest('label');
      if (label && label !== el && label.getBoundingClientRect().height >= 40) continue;
      // `after:absolute after:inset-0` stretches a link over its whole card.
      const stretched = ['::after', '::before'].some((pseudo) => {
        const ps = getComputedStyle(el, pseudo);
        return ps.content !== 'none' && ps.position === 'absolute' && ps.inset === '0px';
      });
      if (stretched) continue;
      // A control can widen its own hit area with an absolutely positioned ::after; measure that too.
      let hit = { width: rect.width, height: rect.height };
      for (const pseudo of ['::after', '::before']) {
        const ps = getComputedStyle(el, pseudo);
        if (ps.content === 'none' || ps.position !== 'absolute') continue;
        const inset = (value) => (value.endsWith('px') ? -parseFloat(value) : 0);
        hit = {
          width: rect.width + inset(ps.left) + inset(ps.right),
          height: rect.height + inset(ps.top) + inset(ps.bottom),
        };
      }
      const isLink = el.tagName === 'A';
      if (isLink && (style.display === 'inline' || el.closest('p, blockquote, li > p'))) continue;
      const floor = isLink ? 32 : 44;
      if (hit.height < floor || hit.width < 24) {
        add(isLink ? 'tap-target-link' : 'tap-target-control', `${Math.round(hit.width)}×${Math.round(hit.height)}`, el);
      }
    }
  }

  return out;
}

async function login(page, identifier, password) {
  await page.goto(`${BASE}/portal/login`, { waitUntil: 'domcontentloaded' });
  await page.locator('input[name="identifier"]').fill(identifier);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole('button', { name: 'Нэвтрэх', exact: true }).click();
  await page.waitForURL(/\/(portal|admin)$/, { timeout: 20_000 });
}

async function auditGroup(browser, label, pages, credentials) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, baseURL: BASE });
  const page = await context.newPage();
  if (credentials) await login(page, credentials.identifier, credentials.password);

  const findings = [];
  for (const [name, path] of pages) {
    await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' }).catch(() => {});
    for (const { w, name: widthName, phone } of WIDTHS) {
      await page.setViewportSize({ width: w, height: 900 });
      // Let the media-query listeners and any resize-driven render settle.
      await page.waitForTimeout(180);
      const issues = await page.evaluate(collectIssues, phone).catch(() => []);
      for (const issue of issues) findings.push({ group: label, page: name, path, width: w, widthName, ...issue });
    }
  }
  await context.close();
  return findings;
}

const groups = process.argv[2];
const browser = await chromium.launch();
const all = [];

if (!groups || groups === 'public') all.push(...(await auditGroup(browser, 'public', PUBLIC_PAGES, null)));
if (!groups || groups === 'portal') {
  all.push(...(await auditGroup(browser, 'portal', PORTAL_PAGES, { identifier: 'client1@example.mn', password: 'Client123!' })));
}
if (!groups || groups === 'admin') {
  all.push(...(await auditGroup(browser, 'admin', ADMIN_PAGES, { identifier: 'admin@lawfirm.mn', password: 'Admin123!' })));
}
await browser.close();

// ── report ────────────────────────────────────────────────────────────────────
const ORDER = ['page-scrolls-sideways', 'element-past-right-edge', 'text-clipped', 'tap-target-control', 'tap-target-link'];
const byType = {};
for (const finding of all) (byType[finding.type] ??= []).push(finding);
for (const key of Object.keys(byType).sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b))) {
  const value = byType[key];
  delete byType[key];
  byType[key] = value;
}

console.log(`\n${all.length} finding(s) across ${WIDTHS.length} widths\n`);
for (const [type, items] of Object.entries(byType)) {
  console.log(`\n── ${type} (${items.length})`);
  // Group identical element+page pairs across widths so the list stays readable.
  const grouped = {};
  for (const item of items) {
    const key = `${item.group}|${item.page}|${item.el}|${item.detail.replace(/\d+/g, 'N')}`;
    (grouped[key] ??= { ...item, widths: [] }).widths.push(item.width);
  }
  for (const entry of Object.values(grouped)) {
    const widths = [...new Set(entry.widths)].join(',');
    console.log(
      `  [${entry.group}] ${entry.page.padEnd(20)} ${widths.padEnd(34)} ${entry.detail.padEnd(18)} ${entry.el}` +
        (entry.text ? `  «${entry.text}»` : ''),
    );
  }
}
console.log(all.length === 0 ? '\nNo layout problems found.\n' : '');
