// Copies non-TypeScript assets emitted by `prisma generate` (e.g. *.wasm, *.js loaders)
// from src/generated into dist/generated so the compiled client can find them at runtime.
import { cpSync, existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, '..', 'src', 'generated');
const dest = join(here, '..', 'dist', 'generated');

if (!existsSync(src)) {
  console.warn('[shared] no generated prisma client found, skipping asset copy');
  process.exit(0);
}

let copied = 0;
const walk = (dir) => {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full);
    } else if (!entry.endsWith('.ts')) {
      cpSync(full, join(dest, full.slice(src.length)), { force: true });
      copied += 1;
    }
  }
};
walk(src);
console.log(`[shared] copied ${copied} prisma runtime asset(s) into dist/generated`);
