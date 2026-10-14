'use client';

import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '@/components/ui/table';
import { ApiError, api } from '@/lib/api';
import { formatDate } from '@/lib/format';

interface EmailLogEntry {
  id: string;
  to: string;
  template: string;
  locale: string;
  status: 'SENT' | 'FAILED' | 'SKIPPED';
  error: string | null;
  attempts: number;
  createdAt: string;
  sentAt: string | null;
}

const STATUS: Record<EmailLogEntry['status'], { tone: 'progress' | 'danger' | 'closed'; label: string }> = {
  SENT: { tone: 'progress', label: 'Илгээсэн' },
  FAILED: { tone: 'danger', label: 'Амжилтгүй' },
  SKIPPED: { tone: 'closed', label: 'Илгээгээгүй' },
};

/** Why nothing was sent, in the admin panel's own language. */
const SKIP_REASONS: Record<string, string> = {
  'mail disabled': 'И-мэйл тохируулаагүй',
  'notifications off': 'Хэрэглэгч мэдэгдлийн и-мэйлийг хаасан',
};

/** The templates by their Mongolian name, so the table is readable without knowing the code. */
const TEMPLATE_LABELS: Record<string, string> = {
  passwordReset: 'Нууц үг сэргээх',
  passwordChanged: 'Нууц үг солигдсон',
  clientInvite: 'Урилга',
  newMessage: 'Шинэ захидал',
  documentRequested: 'Баримтын хүсэлт',
  invoiceIssued: 'Шинэ нэхэмжлэх',
  testimonialPending: 'Сэтгэгдэл хүлээгдэж байна',
  dailyDigest: 'Өдрийн тойм',
};

/**
 * The last 50 e-mails: who they went to, which template and whether they arrived. The body is never
 * stored, so this says what happened without keeping anything that was written to a client.
 */
export function EmailLogCard() {
  const log = useQuery({
    queryKey: ['admin', 'mail-log'],
    queryFn: () => api.get<{ enabled: boolean; items: EmailLogEntry[] }>('/mail/log?limit=50'),
  });

  return (
    <Card className="flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-h4">И-мэйлийн бүртгэл</h3>
        {log.data &&
          (log.data.enabled ? (
            <Badge tone="progress">И-мэйл идэвхтэй</Badge>
          ) : (
            <Badge tone="pending">И-мэйл тохируулаагүй</Badge>
          ))}
      </div>
      <p className="text-body-sm text-text-secondary">
        Сүүлийн 50 захидал. Захидлын агуулга хадгалагддаггүй — зөвхөн хэнд, ямар загвараар явсан, хүрсэн эсэх.
      </p>

      {log.isError ? (
        <ErrorState message={log.error instanceof ApiError ? log.error.message : 'Бүртгэл ачаалж чадсангүй'} onRetry={() => void log.refetch()} />
      ) : log.isLoading ? (
        <Skeleton className="h-32" />
      ) : log.data && log.data.items.length === 0 ? (
        <EmptyState title="Захидал алга" description={log.data.enabled ? 'Одоогоор и-мэйл илгээгдээгүй байна.' : 'SMTP тохируулаагүй тул и-мэйл илгээгдэхгүй байна.'} />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Огноо</TableHeaderCell>
              <TableHeaderCell>Хэнд</TableHeaderCell>
              <TableHeaderCell>Загвар</TableHeaderCell>
              <TableHeaderCell>Төлөв</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {log.data?.items.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="whitespace-nowrap">{formatDate(entry.createdAt, 'mn', true)}</TableCell>
                <TableCell className="max-w-[220px] truncate">{entry.to}</TableCell>
                <TableCell>{TEMPLATE_LABELS[entry.template] ?? entry.template} · {entry.locale}</TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <Badge tone={STATUS[entry.status].tone}>{STATUS[entry.status].label}</Badge>
                    {entry.error && <span className="text-caption text-text-muted">{SKIP_REASONS[entry.error] ?? entry.error}</span>}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}
