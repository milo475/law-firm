/* eslint-disable no-console */
/**
 * Imports the articles in prisma/content/*.md as posts.
 *
 *   pnpm db:seed-content                      # import (or refresh) every article
 *   pnpm db:seed-content --author me@firm.mn  # attribute them to this account
 *
 * Articles arrive as DRAFT: a lawyer has to read them and publish from /admin/posts. Re-running
 * refreshes the title, excerpt, category and body by slug — it never duplicates a post and never
 * changes the status of one that has already been published.
 *
 * File format (front matter + markdown body):
 *
 *   ---
 *   slug: ...
 *   title: ...
 *   excerpt: ...
 *   category: ADVICE | NEWS | LEGAL_UPDATE
 *   ---
 *
 *   Body…
 */
import fs from 'node:fs';
import path from 'node:path';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: [path.resolve(__dirname, '../../../.env'), path.resolve(__dirname, '../.env')] });

import { getPrismaClient } from '../src/db';
import { PostCategory, PostStatus, Role } from '../src/generated/prisma/enums';

const prisma = getPrismaClient();
const CONTENT_DIR = path.resolve(__dirname, 'content');

interface Article {
  file: string;
  slug: string;
  title: string;
  excerpt: string;
  category: PostCategory;
  content: string;
}

/** Minimal front matter reader: `key: value` lines between two `---` fences. */
function parseArticle(file: string): Article {
  const raw = fs.readFileSync(path.join(CONTENT_DIR, file), 'utf8').replace(/\r\n/g, '\n');
  const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(raw);
  if (!match) throw new Error(`${file}: missing the --- front matter block`);
  const meta = new Map<string, string>();
  for (const line of match[1].split('\n')) {
    const separator = line.indexOf(':');
    if (separator === -1) throw new Error(`${file}: cannot read front matter line "${line}"`);
    meta.set(line.slice(0, separator).trim(), line.slice(separator + 1).trim());
  }
  const required = (key: string) => {
    const value = meta.get(key);
    if (!value) throw new Error(`${file}: "${key}" is required in the front matter`);
    return value;
  };
  const category = required('category');
  if (!(category in PostCategory)) throw new Error(`${file}: unknown category "${category}"`);
  return {
    file,
    slug: required('slug'),
    title: required('title'),
    excerpt: required('excerpt'),
    category: category as PostCategory,
    content: match[2].trim(),
  };
}

async function main() {
  const authorFlag = process.argv.indexOf('--author');
  const authorEmail = authorFlag === -1 ? undefined : process.argv[authorFlag + 1];
  const author = authorEmail
    ? await prisma.user.findUnique({ where: { email: authorEmail }, select: { id: true, email: true } })
    : await prisma.user.findFirst({ where: { role: Role.ADMIN }, orderBy: { createdAt: 'asc' }, select: { id: true, email: true } });
  if (!author) throw new Error(authorEmail ? `No user with the e-mail ${authorEmail}` : 'No ADMIN account to attribute the articles to — create one with pnpm db:admin');

  const files = fs.readdirSync(CONTENT_DIR).filter((file) => file.endsWith('.md')).sort();
  if (files.length === 0) throw new Error(`No .md files in ${CONTENT_DIR}`);
  const articles = files.map(parseArticle);
  const duplicate = articles.find((article, index) => articles.findIndex((other) => other.slug === article.slug) !== index);
  if (duplicate) throw new Error(`Two articles share the slug "${duplicate.slug}"`);

  console.log(`Importing ${articles.length} article(s) as ${author.email}`);
  for (const article of articles) {
    const existing = await prisma.post.findUnique({ where: { slug: article.slug }, select: { id: true, status: true } });
    await prisma.post.upsert({
      where: { slug: article.slug },
      // An article a lawyer already published keeps its status and publication date.
      update: { title: article.title, excerpt: article.excerpt, content: article.content, category: article.category },
      create: {
        slug: article.slug,
        title: article.title,
        excerpt: article.excerpt,
        content: article.content,
        category: article.category,
        status: PostStatus.DRAFT,
        authorId: author.id,
      },
    });
    console.log(`  ${existing ? `updated (${existing.status})` : 'created (DRAFT)'}  ${article.slug}`);
  }
  console.log('Done. Review and publish them from /admin/posts.');
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
