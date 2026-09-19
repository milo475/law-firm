/**
 * What a file really is, read from its first bytes rather than from the Content-Type the browser
 * claimed. Renaming payload.exe to contract.pdf and letting the browser announce `application/pdf`
 * is a one-line attack; every upload path checks the bytes before the file reaches the bucket.
 *
 * Written by hand rather than pulled from `file-type`: that package is ESM-only, and the API
 * compiles to CommonJS with `moduleResolution: node`, so adopting it would mean changing the whole
 * app's module resolution for six formats we can recognise in a few dozen lines.
 */

/** The families the allowlist can contain. `ole2` covers the legacy .doc/.xls binary format. */
export type FileFamily = 'pdf' | 'zip' | 'jpg' | 'png' | 'text' | 'ole2';

const startsWith = (buffer: Buffer, bytes: number[]): boolean =>
  buffer.length >= bytes.length && bytes.every((byte, index) => buffer[index] === byte);

/** OOXML is a ZIP; the part names appear as plain bytes in the entry headers. */
const OOXML_MARKERS: Record<'word' | 'excel', string[]> = {
  word: ['word/document.xml', 'word/'],
  excel: ['xl/workbook.xml', 'xl/'],
};

/**
 * True when the buffer looks like text: decodable as UTF-8 and free of NUL and other control bytes
 * (tab, newline and carriage return are fine). Plain text has no signature to check.
 */
function looksLikeText(buffer: Buffer): boolean {
  const sample = buffer.subarray(0, 4096);
  if (sample.includes(0)) return false;
  for (const byte of sample) {
    const isControl = byte < 0x20 && byte !== 0x09 && byte !== 0x0a && byte !== 0x0d;
    if (isControl) return false;
  }
  // A lone replacement character means the bytes were not valid UTF-8.
  return !sample.toString('utf8').includes('\uFFFD') || buffer.length > sample.length;
}

/** The family the bytes belong to, or null when nothing matches. */
export function detectFamily(buffer: Buffer): FileFamily | null {
  if (startsWith(buffer, [0x25, 0x50, 0x44, 0x46, 0x2d])) return 'pdf'; // %PDF-
  if (startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'png';
  if (startsWith(buffer, [0xff, 0xd8, 0xff])) return 'jpg';
  if (startsWith(buffer, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) return 'ole2'; // legacy .doc / .xls
  // Local file header, empty archive, or spanned archive.
  if (startsWith(buffer, [0x50, 0x4b, 0x03, 0x04]) || startsWith(buffer, [0x50, 0x4b, 0x05, 0x06]) || startsWith(buffer, [0x50, 0x4b, 0x07, 0x08])) {
    return 'zip';
  }
  return looksLikeText(buffer) ? 'text' : null;
}

/** Which OOXML flavour a ZIP holds, judged by the part names inside it. */
function ooxmlFlavour(buffer: Buffer): 'word' | 'excel' | null {
  // The entry names sit in the first kilobytes (local headers) and at the end (central directory).
  const head = buffer.subarray(0, 8192).toString('latin1');
  const tail = buffer.subarray(Math.max(0, buffer.length - 8192)).toString('latin1');
  const haystack = head + tail;
  for (const [flavour, markers] of Object.entries(OOXML_MARKERS) as ['word' | 'excel', string[]][]) {
    if (markers.some((marker) => haystack.includes(marker))) return flavour;
  }
  return null;
}

/** MIME type → the families whose bytes may legitimately carry it. */
const MIME_FAMILIES: Record<string, FileFamily[]> = {
  'application/pdf': ['pdf'],
  'image/jpeg': ['jpg'],
  'image/png': ['png'],
  'image/webp': ['zip'], // never reached: WEBP is handled by its own RIFF check below
  'text/plain': ['text'],
  'application/msword': ['ole2'],
  'application/vnd.ms-excel': ['ole2'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['zip'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['zip'],
};

/** OOXML types additionally have to match the right flavour inside the ZIP. */
const OOXML_MIME: Record<string, 'word' | 'excel'> = {
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'word',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'excel',
};

/** WEBP: `RIFF....WEBP`. Only the post cover upload accepts it. */
function isWebp(buffer: Buffer): boolean {
  return (
    startsWith(buffer, [0x52, 0x49, 0x46, 0x46]) &&
    buffer.length >= 12 &&
    buffer.subarray(8, 12).toString('latin1') === 'WEBP'
  );
}

/**
 * True when the bytes back up the declared MIME type. An unknown declared type is rejected by the
 * allowlist before this runs, so anything unrecognised here is a mismatch.
 */
export function contentMatchesMimeType(buffer: Buffer, mimeType: string): boolean {
  if (buffer.length === 0) return false;
  if (mimeType === 'image/webp') return isWebp(buffer);

  const allowed = MIME_FAMILIES[mimeType];
  if (!allowed) return false;

  const family = detectFamily(buffer);
  if (!family || !allowed.includes(family)) return false;

  const flavour = OOXML_MIME[mimeType];
  if (flavour) return ooxmlFlavour(buffer) === flavour;
  return true;
}

const MAX_FILE_NAME_LENGTH = 255;

/**
 * A file name safe to store and to hand back in a Content-Disposition header: no directory parts,
 * no control characters, and short enough for any filesystem. The extension is kept when the name
 * has to be shortened.
 */
export function sanitizeFileName(rawName: string, fallback = 'file'): string {
  // Take the last path segment, so `../../etc/passwd` and `C:\tmp\x.pdf` both collapse to the name.
  const lastSegment = rawName.split(/[\\/]/).pop() ?? '';
  // eslint-disable-next-line no-control-regex -- stripping control characters is the point
  const cleaned = lastSegment.replace(/[\u0000-\u001f\u007f]/g, '').replace(/^\.+/, '').trim();
  if (!cleaned) return fallback;
  if (cleaned.length <= MAX_FILE_NAME_LENGTH) return cleaned;

  const dot = cleaned.lastIndexOf('.');
  const extension = dot > 0 && cleaned.length - dot <= 10 ? cleaned.slice(dot) : '';
  return cleaned.slice(0, MAX_FILE_NAME_LENGTH - extension.length) + extension;
}
