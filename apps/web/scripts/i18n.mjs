#!/usr/bin/env node
/**
 * Translation workflow for messages/{mn,en,zh}.json.
 *
 *   pnpm i18n:export [file]   messages/mn.json → CSV for the firm to fill in (key, mn, en, zh, context)
 *   pnpm i18n:import [file]   the filled CSV → en.json / zh.json (empty cells stay empty)
 *   pnpm i18n:check           key parity between the three files, how much is still untranslated,
 *                             and that every message compiles — plurals rendered at 0, 1, 2, 11, 21
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
const REPO_ROOT = path.resolve(WEB_DIR, '../..');
const CSV_NAME = 'i18n-translations.csv';

/**
 * pnpm runs the script with the package as the working directory, so a relative file name typed at
 * the repo root would be looked up in apps/web. INIT_CWD is where the user actually stood.
 */
const CALLER_DIR = process.env.INIT_CWD || process.cwd();

/** Directories a relative file name is looked up in, in order. */
const searchDirs = () => [...new Set([CALLER_DIR, process.cwd(), REPO_ROOT, WEB_DIR])];

/** Existing file for reading: the first candidate that exists, or null with the list that was tried. */
function resolveExisting(file) {
  if (file && path.isAbsolute(file)) return { path: fs.existsSync(file) ? file : null, tried: [file] };
  const name = file || CSV_NAME;
  const tried = searchDirs().map((dir) => path.resolve(dir, name));
  return { path: tried.find((candidate) => fs.existsSync(candidate)) ?? null, tried };
}

/** Target for writing: an absolute path as given, otherwise next to the caller. */
function resolveTarget(file) {
  if (file && path.isAbsolute(file)) return file;
  return path.resolve(CALLER_DIR, file || CSV_NAME);
}

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
  reviews: 'Харилцагчдын сэтгэгдэл (нүүр, /reviews, үйлчилгээний хуудас)',
  enums: 'Төлөв, төрөл, эрхийн нэрс (хэрэг, нэхэмжлэх, хүсэлт)',
  portal: 'Харилцагчийн портал (/portal) — нэвтрэх, хэрэг, баримт, нэхэмжлэх, мессеж, профайл',
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

function exportCsv(file) {
  const target = resolveTarget(file);
  const flat = LOCALES.map((locale) => flatten(read(locale)));
  const [mn, en, zh] = flat;
  const lines = ['key,mn,en,zh,context'];
  for (const [key, value] of Object.entries(mn)) {
    const context = CONTEXT[key.split('.')[0]] ?? '';
    lines.push([key, value, en[key] ?? '', zh[key] ?? '', context].map(csvCell).join(','));
  }
  fs.writeFileSync(target, `${lines.join('\n')}\n`);
  console.log(`${Object.keys(mn).length} keys → ${target}`);
}

function importCsv(file) {
  const { path: source, tried } = resolveExisting(file);
  if (!source) {
    throw new Error(`${file || CSV_NAME} not found — run pnpm i18n:export first. Looked in:\n  ${tried.join('\n  ')}`);
  }
  console.log(`Reading ${source}`);
  const rows = parseCsv(fs.readFileSync(source, 'utf8'));
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

async function check() {
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
  await formatCheck(flat);
}

/** Counts a message's placeholders, and which of them a plural / number clause consumes as a number. */
function placeholders(message) {
  const names = new Set([...message.matchAll(/\{\s*(\w+)/g)].map((match) => match[1]));
  const values = {};
  for (const name of names) {
    const numeric = new RegExp(`\\{\\s*${name}\\s*,\\s*(plural|selectordinal|number)`).test(message);
    values[name] = numeric ? 2 : 'x';
  }
  return values;
}

/**
 * Every message is run through the app's own formatter, so a broken ICU clause fails here instead
 * of at the reader's screen. Plurals are rendered at the counts that tell the categories apart
 * (English needs `one` at 1; Mongolian has the same two categories; Chinese only has `other`).
 */
async function formatCheck(flat) {
  const { createTranslator } = await import('next-intl');
  const COUNTS = [0, 1, 2, 11, 21];
  let broken = 0;
  let plurals = 0;
  for (const locale of LOCALES) {
    for (const [key, message] of Object.entries(flat[locale])) {
      if (!message) continue;
      const values = placeholders(message);
      const isPlural = /\{\s*\w+\s*,\s*plural\s*,/.test(message);
      if (isPlural && locale === 'mn') plurals += 1;
      const counts = isPlural ? COUNTS : [null];
      let reported = false;
      for (const count of counts) {
        const numbers = count === null ? {} : Object.fromEntries(
          Object.entries(values).filter(([, value]) => typeof value === 'number').map(([name]) => [name, count]),
        );
        // A dotted key would be read as a path, so the message is handed over under a flat one.
        const translate = createTranslator({
          locale,
          messages: { message },
          onError: (error) => {
            if (reported) return;
            reported = true;
            broken += 1;
            console.error(`  ${locale} ${key}: ${String(error.message).split('\n')[0]}`);
          },
        });
        translate('message', { ...values, ...numbers });
      }
    }
  }
  if (broken) {
    console.error(`\n${broken} message(s) failed to format.`);
    process.exit(1);
  }
  console.log(`Every message formats; ${plurals} plural message(s) rendered at ${COUNTS.join(', ')}.`);
}

const [command, file] = process.argv.slice(2);
try {
  if (command === 'export') exportCsv(file);
  else if (command === 'import') importCsv(file);
  else if (command === 'check') await check();
  else {
    console.error('Usage: i18n.mjs export|import|check [file]');
    process.exit(1);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
