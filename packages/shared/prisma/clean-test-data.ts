/* eslint-disable no-console */
/**
 * Removes the rows an e2e run (or manual smoke testing) leaves behind, keeping the demo rows
 * `seed.ts` writes. Test rows are recognised by the conventions in src/utils/test-data.ts:
 * an `E2E ` label on the title/body and an `e2e.` e-mail on registered users.
 *
 *   pnpm db:clean                       # clean the database DATABASE_URL points at
 *   pnpm db:clean --dry-run             # only report what would go
 *   pnpm db:clean --prefix 'Smoke'      # treat one more prefix as test data (repeatable)
 *   pnpm db:clean --audit               # also empty the audit log (login noise)
 *   pnpm db:clean --sessions            # also drop every refresh token (logs all sessions out)
 *   pnpm db:clean --force lawfirm_stage # allow a database that is not named *_test
 *
 * Only `test` and `*_test` databases are accepted without --force, so the dev database is safe.
 * --dry-run reports what matches right now; a real run removes more, because rows only become
 * dangling once the cases and tasks they point at are gone.
 */
import path from 'node:path';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: [path.resolve(__dirname, '../../../.env'), path.resolve(__dirname, '../.env')] });

import { getPrismaClient } from '../src/db';
import { assertTestDatabase, TEST_EMAIL_PREFIX, TEST_LABEL_PREFIX } from '../src/utils/test-data';

const prisma = getPrismaClient();

interface Options {
  dryRun: boolean;
  audit: boolean;
  sessions: boolean;
  force: string | null;
  prefixes: string[];
}

function parseArgs(argv: string[]): Options {
  const options: Options = { dryRun: false, audit: false, sessions: false, force: null, prefixes: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--audit') options.audit = true;
    else if (arg === '--sessions') options.sessions = true;
    else if (arg === '--force') options.force = argv[(i += 1)] ?? null;
    else if (arg === '--prefix') {
      const value = argv[(i += 1)];
      if (!value) throw new Error('--prefix needs a value');
      options.prefixes.push(value);
    } else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

/** The slice of a Prisma delegate this script uses — every model exposes it. */
interface Model {
  count: (args: { where: unknown }) => Promise<number>;
  deleteMany: (args: { where: unknown }) => Promise<{ count: number }>;
  findMany: (args: { where: { id: { in: string[] } }; select: { id: true } }) => Promise<{ id: string }[]>;
}
const model = (delegate: unknown) => delegate as unknown as Model;

const CHUNK = 1000;
function chunked<T>(items: T[]): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += CHUNK) chunks.push(items.slice(i, i + CHUNK));
  return chunks;
}

/** Ids that still exist, looked up in chunks so a long id list stays within the parameter limit. */
async function existingIds(delegate: unknown, ids: string[]): Promise<Set<string>> {
  const found = new Set<string>();
  for (const chunk of chunked(ids)) {
    for (const row of await model(delegate).findMany({ where: { id: { in: chunk } }, select: { id: true } })) found.add(row.id);
  }
  return found;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const database = assertTestDatabase(process.env.DATABASE_URL, options.force);
  const labels = [TEST_LABEL_PREFIX, ...options.prefixes];
  const emails = [TEST_EMAIL_PREFIX, ...options.prefixes];
  console.log(`Cleaning test data in "${database}"${options.dryRun ? ' (dry run)' : ''}`);
  console.log(`  labels:  ${labels.map((prefix) => JSON.stringify(prefix)).join(', ')}`);
  console.log(`  e-mails: ${emails.map((prefix) => JSON.stringify(prefix)).join(', ')}`);

  const removed: [string, number][] = [];
  const purge = async (table: string, delegate: unknown, where: unknown) => {
    const count = options.dryRun ? await model(delegate).count({ where }) : (await model(delegate).deleteMany({ where })).count;
    if (count > 0) removed.push([table, count]);
    return count;
  };
  /** Deletes by id in chunks and reports the total under one label. */
  const purgeIds = async (table: string, delegate: unknown, ids: string[]) => {
    let total = 0;
    for (const chunk of chunked(ids)) {
      const where = { id: { in: chunk } };
      total += options.dryRun ? await model(delegate).count({ where }) : (await model(delegate).deleteMany({ where })).count;
    }
    if (total > 0) removed.push([table, total]);
  };
  /** OR over the configured prefixes for one text column. */
  const labelled = (field: string) => labels.map((prefix) => ({ [field]: { startsWith: prefix } }));

  // ── What counts as test data ───────────────────────────────────────────────
  const userIds = (
    await prisma.user.findMany({ where: { OR: emails.map((prefix) => ({ email: { startsWith: prefix } })) }, select: { id: true } })
  ).map((user) => user.id);
  const caseIds = (
    await prisma.case.findMany({
      where: { OR: [...labelled('title'), { clientId: { in: userIds } }, { lawyerId: { in: userIds } }] },
      select: { id: true },
    })
  ).map((item) => item.id);
  const taskIds = (
    await prisma.task.findMany({
      where: {
        OR: [...labelled('title'), { caseId: { in: caseIds } }, { assigneeId: { in: userIds } }, { createdById: { in: userIds } }],
      },
      select: { id: true },
    })
  ).map((item) => item.id);

  // ── Children first; only Case → its children cascades in the schema ────────
  await purge('TaskAttachment', prisma.taskAttachment, { OR: [{ taskId: { in: taskIds } }, { uploadedById: { in: userIds } }] });
  await purge('TaskComment', prisma.taskComment, { OR: [{ taskId: { in: taskIds } }, { authorId: { in: userIds } }] });
  await purgeIds('Task', prisma.task, taskIds);
  await purge('Message', prisma.message, { OR: [...labelled('body'), { caseId: { in: caseIds } }, { senderId: { in: userIds } }] });
  await purge('Document', prisma.document, { OR: [...labelled('name'), { caseId: { in: caseIds } }, { uploadedById: { in: userIds } }] });
  await purge('DocumentRequest', prisma.documentRequest, {
    OR: [...labelled('title'), { caseId: { in: caseIds } }, { requestedById: { in: userIds } }],
  });
  await purge('CaseEvent', prisma.caseEvent, { OR: [...labelled('title'), { caseId: { in: caseIds } }, { createdById: { in: userIds } }] });
  await purge('Invoice', prisma.invoice, { OR: [...labelled('description'), { caseId: { in: caseIds } }] });
  await purge('CaseMember', prisma.caseMember, {
    OR: [{ caseId: { in: caseIds } }, { userId: { in: userIds } }, { addedById: { in: userIds } }],
  });
  await purge('ServiceRequest', prisma.serviceRequest, {
    OR: [...labelled('title'), { requesterId: { in: userIds } }, { assignedCaseId: { in: caseIds } }],
  });
  await purge('Testimonial', prisma.testimonial, {
    OR: [...labelled('body'), { caseId: { in: caseIds } }, { authorUserId: { in: userIds } }, { approvedById: { in: userIds } }],
  });
  await purgeIds('Case', prisma.case, caseIds);
  await purge('Post', prisma.post, { OR: [...labelled('title'), { authorId: { in: userIds } }] });
  await purge('Notification', prisma.notification, { OR: [{ userId: { in: userIds } }, { actorId: { in: userIds } }] });
  await purge('AuditLog', prisma.auditLog, { userId: { in: userIds } });
  await purge('RefreshToken', prisma.refreshToken, {
    OR: [{ userId: { in: userIds } }, { revokedAt: { not: null } }, { expiresAt: { lt: new Date() } }],
  });
  await purgeIds('User', prisma.user, userIds);

  // ── Rows still pointing at something that was just deleted ─────────────────
  await purgeIds('Notification (dangling)', prisma.notification, await danglingNotificationIds());
  await purgeIds('AuditLog (dangling)', prisma.auditLog, await danglingAuditLogIds());
  if (options.audit) await purge('AuditLog (all)', prisma.auditLog, {});
  if (options.sessions) await purge('RefreshToken (all)', prisma.refreshToken, {});

  if (removed.length === 0) {
    console.log('Nothing to clean.');
  } else {
    const width = Math.max(...removed.map(([table]) => table.length));
    const verb = options.dryRun ? 'would remove' : 'removed';
    for (const [table, count] of removed) console.log(`  ${table.padEnd(width)}  ${verb} ${count}`);
  }
  console.log('Done.');
}

/** `/admin/cases/<uuid>`, `/portal/invoices/<uuid>`, … — the first entity segment wins. */
const LINK_TARGET = /\/(cases|tasks|invoices|requests|documents)\/([0-9a-f-]{36})/;
const LINK_MODELS: Record<string, unknown> = {
  cases: prisma.case,
  tasks: prisma.task,
  invoices: prisma.invoice,
  requests: prisma.serviceRequest,
  documents: prisma.document,
};

/** Notifications whose link would open a page for a row that no longer exists (a 404 for the user). */
async function danglingNotificationIds(): Promise<string[]> {
  const notifications = await prisma.notification.findMany({ where: { link: { not: null } }, select: { id: true, link: true } });
  const byKind = new Map<string, Map<string, string[]>>();
  for (const { id, link } of notifications) {
    const match = LINK_TARGET.exec(link ?? '');
    if (!match) continue;
    const [, kind, targetId] = match;
    const targets = byKind.get(kind) ?? new Map<string, string[]>();
    targets.set(targetId, [...(targets.get(targetId) ?? []), id]);
    byKind.set(kind, targets);
  }
  const dangling: string[] = [];
  for (const [kind, targets] of byKind) {
    const alive = await existingIds(LINK_MODELS[kind], [...targets.keys()]);
    for (const [targetId, ids] of targets) if (!alive.has(targetId)) dangling.push(...ids);
  }
  return dangling;
}

/** Audit rows about an entity that is gone. Entities the log cannot resolve (auth, settings) are kept. */
async function danglingAuditLogIds(): Promise<string[]> {
  const models: Record<string, unknown> = {
    cases: prisma.case,
    invoices: prisma.invoice,
    tasks: prisma.task,
    messages: prisma.message,
    'document-requests': prisma.documentRequest,
    'service-requests': prisma.serviceRequest,
    documents: prisma.document,
    events: prisma.caseEvent,
    members: prisma.caseMember,
    'task-attachments': prisma.taskAttachment,
    posts: prisma.post,
    users: prisma.user,
  };
  const logs = await prisma.auditLog.findMany({
    where: { entity: { in: Object.keys(models) }, entityId: { not: null } },
    select: { id: true, entity: true, entityId: true },
  });
  const byEntity = new Map<string, Map<string, string[]>>();
  for (const log of logs) {
    const targets = byEntity.get(log.entity) ?? new Map<string, string[]>();
    targets.set(log.entityId!, [...(targets.get(log.entityId!) ?? []), log.id]);
    byEntity.set(log.entity, targets);
  }
  const dangling: string[] = [];
  for (const [entity, targets] of byEntity) {
    const alive = await existingIds(models[entity], [...targets.keys()]);
    for (const [targetId, ids] of targets) if (!alive.has(targetId)) dangling.push(...ids);
  }
  return dangling;
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
