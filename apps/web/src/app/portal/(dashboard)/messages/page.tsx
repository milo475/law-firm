// Figma: 02 Client Portal / Portal / 08 Messages / Desktop (32:722) + Mobile (36:1348)
// There is no messaging API yet: the designed layout (conversation list · thread · composer) is rendered as an
// empty "Тун удахгүй" shell with a disabled composer. No sample conversations are shown.
import { AttachIcon, AttachSmIcon, MessagesIcon, SearchIcon, SendIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/states';

export default function MessagesPage() {
  return (
    // Mobile: full-bleed thread view filling the space between the 64px header and 76px tab bar.
    // Desktop: Figma "Inner" card (radius-lg, border) — 320px conversations + thread, up to 820px tall.
    <div className="-mx-5 -mb-9 -mt-6 flex min-h-[calc(100dvh-140px)] flex-col md:mx-0 md:-mt-2 md:mb-0 md:h-[calc(100dvh-144px)] md:max-h-[820px] md:min-h-[520px] md:flex-row md:overflow-hidden md:rounded-lg md:border md:border-border-default md:bg-bg-surface">
      {/* Figma "Conversations" (32:738) — desktop only */}
      <aside aria-labelledby="conversations-heading" className="hidden w-[320px] shrink-0 flex-col border-r border-border-default bg-bg-surface md:flex">
        <div className="flex flex-col gap-3.5 px-5 pb-4 pt-6">
          <h2 id="conversations-heading" className="text-h4 text-text-primary">Харилцан яриа</h2>
          <label className="flex h-11 items-center gap-2.5 rounded-md bg-bg-surface-alt px-3">
            <SearchIcon size={17.1} className="shrink-0 text-text-muted" />
            <span className="sr-only">Харилцан яриа хайх</span>
            <input
              type="search"
              disabled
              placeholder="Хайх"
              className="w-full bg-transparent text-body-sm text-text-primary outline-none placeholder:text-text-muted disabled:cursor-not-allowed"
            />
          </label>
        </div>
        <p className="px-5 py-4 text-body-sm text-text-muted">Харилцан яриа одоогоор байхгүй.</p>
      </aside>

      {/* Figma "Thread" (32:773) */}
      <section aria-labelledby="thread-heading" className="flex min-w-0 flex-1 flex-col bg-bg-page">
        {/* Thread header (desktop 76px) · "Context" strip (mobile) */}
        <div className="flex items-center gap-3.5 bg-bg-surface px-5 py-3 md:h-[76px] md:border-b md:border-border-default md:px-6 md:py-0">
          <span aria-hidden className="hidden size-11 shrink-0 items-center justify-center rounded-full bg-bg-inverse text-text-on-inverse md:flex">
            <MessagesIcon />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <h2 id="thread-heading" className="hidden text-body-medium text-text-primary md:block">Хуульчтайгаа харилцах</h2>
            <p className="text-caption text-text-muted">Хариуцсан хуульчтайгаа портал дээрээс шууд харилцах хэсэг · Тун удахгүй</p>
          </div>
        </div>

        {/* Figma "Messages" (32:780) */}
        <div className="flex flex-1 flex-col p-5 md:p-6">
          <EmptyState
            className="my-auto"
            icon={<MessagesIcon size={24} />}
            title="Тун удахгүй"
            description="Мессежийн үйлчилгээ удахгүй нээгдэнэ. Одоогоор хариуцсан хуульчтайгаа и-мэйл, утсаар холбогдоно уу."
          />
        </div>

        {/* Figma "Composer" (32:811 desktop 88px · 36:1393 mobile 80px) — disabled until messaging ships */}
        <div role="group" aria-label="Мессеж бичих (тун удахгүй)" className="flex h-20 shrink-0 items-center gap-2.5 border-t border-border-default bg-bg-surface px-4 md:h-[88px] md:gap-3 md:px-6">
          <Button variant="ghost" size="icon" disabled aria-label="Файл хавсаргах" className="bg-bg-page text-text-secondary md:size-12 md:bg-bg-surface-alt">
            <AttachSmIcon className="md:hidden" />
            <AttachIcon className="hidden md:block" />
          </Button>
          <Input
            disabled
            aria-label="Мессеж"
            placeholder="Мессеж бичих..."
            wrapperClassName="min-w-0 flex-1"
            className="h-11 rounded-full bg-bg-page px-3.5 text-body-sm md:h-12 md:rounded-md md:bg-bg-surface md:px-4 md:text-body"
          />
          <Button size="icon" disabled aria-label="Илгээх" className="rounded-full md:hidden">
            <SendIcon />
          </Button>
          <Button size="md" disabled className="hidden md:inline-flex">Илгээх</Button>
        </div>
      </section>
    </div>
  );
}
