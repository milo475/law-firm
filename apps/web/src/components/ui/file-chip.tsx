// Figma: Design System / File chip (9:36) — Type: PDF / DOCX / IMG
import { cn } from '@/lib/utils';

type Kind = 'PDF' | 'DOCX' | 'XLSX' | 'IMG' | 'TXT' | 'FILE';

const KIND_STYLE: Record<Kind, string> = {
  PDF: 'bg-danger-100 text-danger-700',
  DOCX: 'bg-info-100 text-info-700',
  XLSX: 'bg-success-100 text-success-700',
  IMG: 'bg-success-100 text-success-700',
  TXT: 'bg-bg-surface-alt text-text-secondary',
  FILE: 'bg-bg-surface-alt text-text-secondary',
};

export function fileKind(mimeType: string, name = ''): Kind {
  if (mimeType === 'application/pdf') return 'PDF';
  if (mimeType.includes('word')) return 'DOCX';
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'XLSX';
  if (mimeType.startsWith('image/')) return 'IMG';
  if (mimeType.startsWith('text/')) return 'TXT';
  const ext = name.split('.').pop()?.toUpperCase();
  return ext === 'PDF' || ext === 'DOCX' || ext === 'XLSX' ? ext : 'FILE';
}

export interface FileChipProps extends React.HTMLAttributes<HTMLDivElement> {
  name: string;
  meta: string;
  mimeType?: string;
  action?: React.ReactNode;
}

export function FileChip({ name, meta, mimeType = '', action, className, ...props }: FileChipProps) {
  const kind = fileKind(mimeType, name);
  return (
    <div className={cn('flex items-center gap-3 rounded-md border border-border-default bg-bg-surface py-2.5 pl-3 pr-4', className)} {...props}>
      <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-sm text-caption', KIND_STYLE[kind])} aria-hidden>
        {kind}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="truncate text-body-sm-medium text-text-primary">{name}</p>
        <p className="text-caption text-text-muted">{meta}</p>
      </div>
      {action}
    </div>
  );
}
