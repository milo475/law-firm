#!/usr/bin/env node
/**
 * Translation workflow for messages/{mn,en,zh}.json.
 *
 *   pnpm i18n:export [file]   messages/mn.json → CSV for the firm to fill in (key, mn, en, zh, context)
 *   pnpm i18n:import [file]   the filled CSV → en.json / zh.json (empty cells stay empty)
 *   pnpm i18n:check           key parity between the three files + how much is still untranslated
 *
 * Empty values are intentional: the site falls back to the Mongolian string until a translation
 * arrives (see src/i18n/request.ts), so a half-filled file is safe to ship.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WEB_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MESSAGES = path.join(WEB_DIR, 'messages');
const LOCALES = ['mn', 'en', 'zh'];
const DEFAULT_CSV = path.resolve(WEB_DIR, '../../i18n-translations.csv');

/** Where each top-level namespace shows up, for the "context" column. */
const CONTEXT = {
  site: 'Сайт даяар (title, metadata, хэл сонголт)',
  nav: 'Толгой цэс (desktop + гар утас)',
  footer: 'Хөл',
  common: 'Дахин ашиглагддаг (замын заалт, товч, төлөв)',
  states: 'Хоосон / алдааны төлөв, хуудаслалт',
  postCategory: 'Нийтлэлийн ангилал',
  home: 'Нүүр хуудас',
  about: 'Бидний тухай',
  servicesPage: 'Үйлчилгээний жагсаалт ба дэлгэрэнгүй',
  services: 'Үйлчилгээний агуулга (чиглэл бүр)',
  faqPage: 'Түгээмэл асуулт — хуудасны бүтэц',
  faq: 'Түгээмэл асуулт — асуулт, хариулт',
  lawyers: 'Хуульчдын жагсаалт',
  lawyerDetail: 'Хуульчийн дэлгэрэнгүй',
  news: 'Мэдээ, нийтлэл',
  contact: 'Холбоо барих',
  privacy: 'Нууцлалын бодлого',
  terms: 'Үйлчилгээний нөхцөл',
  notFound: '404 хуудас',
};

const read = (locale) => JSON.parse(fs.readFileSync(path.join(MESSAGES, `${locale}.json`), 'utf8'));
const write = (locale, data) => fs.writeFileSync(path.join(MESSAGES, `${locale}.json`), `${JSON.stringify(data, null, 2)}\n`);

/** { a: { b: 'x' }, list: ['y'] } → { 'a.b': 'x', 'list.0': 'y' } */
function flatten(node, prefix = '', out = {}) {
  if (typeof node === 'string') {
    out[prefix] = node;
    return out;
  }
  const entries = Array.isArray(node) ? node.map((value, index) => [String(index), value]) : Object.entries(node ?? {});
  for (const [key, value] of entries) flatten(value, prefix ? `${prefix}.${key}` : key, out);
  return out;
}

/** Writes `a.b.0` into the right place, creating arrays for numeric segments. */
function setPath(target, key, value) {
  const parts = key.split('.');
  let node = target;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const part = parts[i];
    const nextIsIndex = /^\d+$/.test(parts[i + 1]);
    if (node[part] === undefined) node[part] = nextIsIndex ? [] : {};
    node = node[part];
  }
  node[parts[parts.length - 1]] = value;
}

const csvCell = (value) => (/[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { cell += '"'; i += 1; }
      else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') { row.push(cell); cell = ''; }
    else if (char === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (char !== '\r') cell += char;
  }
  if (cell.length > 0 || row.length > 0) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim().length > 0));
}

function exportCsv(file = DEFAULT_CSV) {
  const flat = LOCALES.map((locale) => flatten(read(locale)));
  const [mn, en, zh] = flat;
  const lines = ['key,mn,en,zh,context'];
  for (const [key, value] of Object.entries(mn)) {
    const context = CONTEXT[key.split('.')[0]] ?? '';
    lines.push([key, value, en[key] ?? '', zh[key] ?? '', context].map(csvCell).join(','));
  }
  fs.writeFileSync(file, `${lines.join('\n')}\n`);
  console.log(`${Object.keys(mn).length} keys → ${path.relative(process.cwd(), file)}`);
}

function importCsv(file = DEFAULT_CSV) {
  if (!fs.existsSync(file)) throw new Error(`${file} not found — run pnpm i18n:export first`);
  const rows = parseCsv(fs.readFileSync(file, 'utf8'));
  const header = rows.shift();
  const index = { key: header.indexOf('key'), en: header.indexOf('en'), zh: header.indexOf('zh') };
  if (index.key === -1 || index.en === -1 || index.zh === -1) throw new Error('The CSV needs key, en and zh columns');
  const mnKeys = new Set(Object.keys(flatten(read('mn'))));
  const filled = { en: 0, zh: 0 };
  const unknown = [];
  const next = { en: {}, zh: {} };
  for (const row of rows) {
    const key = row[index.key]?.trim();
    if (!key) continue;
    if (!mnKeys.has(key)) { unknown.push(key); continue; }
    for (const locale of ['en', 'zh']) {
      const value = (row[index[locale]] ?? '').trim();
      setPath(next[locale], key, value);
      if (value) filled[locale] += 1;
    }
  }
  // Keys missing from the CSV keep their current value.
  for (const locale of ['en', 'zh']) {
    const current = flatten(read(locale));
    for (const [key, value] of Object.entries(current)) {
      if (value && !flatten(next[locale])[key]) setPath(next[locale], key, value);
    }
    write(locale, next[locale]);
  }
  console.log(`Imported: en ${filled.en}, zh ${filled.zh} translated value(s)`);
  if (unknown.length) console.warn(`Skipped ${unknown.length} key(s) that are not in mn.json, e.g. ${unknown.slice(0, 3).join(', ')}`);
}

function check() {
  const flat = Object.fromEntries(LOCALES.map((locale) => [locale, flatten(read(locale))]));
  const mnKeys = Object.keys(flat.mn);
  let failed = false;
  console.log(`mn.json: ${mnKeys.length} keys`);
  for (const locale of ['en', 'zh']) {
    const keys = Object.keys(flat[locale]);
    const missing = mnKeys.filter((key) => !(key in flat[locale]));
    const extra = keys.filter((key) => !(key in flat.mn));
    const untranslated = mnKeys.filter((key) => !(flat[locale][key] ?? '').trim());
    console.log(`${locale}.json: ${keys.length} keys · ${mnKeys.length - untranslated.length} translated · ${untranslated.length} pending`);
    if (missing.length) { console.error(`  ${missing.length} key(s) missing, e.g. ${missing.slice(0, 5).join(', ')}`); failed = true; }
    if (extra.length) { console.error(`  ${extra.length} key(s) not in mn.json, e.g. ${extra.slice(0, 5).join(', ')}`); failed = true; }
  }
  if (failed) {
    console.error('\nKeys do not match. Run pnpm i18n:export, fill the CSV and pnpm i18n:import.');
    process.exit(1);
  }
  console.log('\nKeys match across mn, en and zh.');
}

const [command, file] = process.argv.slice(2);
try {
  if (command === 'export') exportCsv(file ? path.resolve(file) : undefined);
  else if (command === 'import') importCsv(file ? path.resolve(file) : undefined);
  else if (command === 'check') check();
  else {
    console.error('Usage: i18n.mjs export|import|check [file]');
    process.exit(1);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
