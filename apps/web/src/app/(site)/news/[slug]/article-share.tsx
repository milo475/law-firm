// Figma: 01 Public Site / Public / 08 Article Detail — "Share" row (21:767 desktop, 25:1671 mobile): label + 3 × 44px tiles
'use client';

import { ShareArrowIcon, SharePlusIcon, ShareSquareIcon } from '@/components/icons';
import { toast } from '@/components/ui/toast';

const tile = 'focus-ring inline-flex size-11 shrink-0 items-center justify-center rounded-md border border-border-default bg-bg-page text-text-secondary transition-colors hover:border-border-strong hover:text-text-brand';

export function ArticleShare({ title }: { title: string }) {
  const url = () => window.location.href;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url());
      toast.success('Холбоос хуулагдлаа');
    } catch {
      toast.danger('Холбоос хуулж чадсангүй');
    }
  }

  async function nativeShare() {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, url: url() });
      } catch {
        // user dismissed the share sheet
      }
      return;
    }
    await copyLink();
  }

  function mailShare() {
    window.location.href = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url())}`;
  }

  return (
    <div className="flex items-center gap-2.5 md:gap-3">
      <span className="text-body-sm-medium text-text-secondary">Хуваалцах:</span>
      <button type="button" onClick={copyLink} className={tile} aria-label="Холбоос хуулах" title="Холбоос хуулах">
        <ShareSquareIcon size={44} />
      </button>
      <button type="button" onClick={nativeShare} className={tile} aria-label="Хуваалцах" title="Хуваалцах">
        <SharePlusIcon size={44} />
      </button>
      <button type="button" onClick={mailShare} className={tile} aria-label="Имэйлээр илгээх" title="Имэйлээр илгээх">
        <ShareArrowIcon size={44} />
      </button>
    </div>
  );
}
