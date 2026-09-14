// Figma: Design System / Avatar (9:17) — Type: Initials / Photo; Size: sm32 / md48 / lg72
import { cva, type VariantProps } from 'class-variance-authority';
import { AvatarPhotoPlaceholder } from '@/components/icons';
import { cn } from '@/lib/utils';

const avatarVariants = cva(
  'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border-default bg-bg-brand-soft text-text-brand',
  {
    variants: {
      size: {
        sm: 'size-8 text-caption',
        md: 'size-12 text-body-medium',
        lg: 'size-[72px] text-body-lg',
      },
      tone: {
        soft: '',
        // Portal sidebar user avatar: gold fill, navy text
        accent: 'border-transparent bg-accent-default text-text-on-accent',
      },
    },
    defaultVariants: { size: 'md', tone: 'soft' },
  },
);

const PX = { sm: 32, md: 48, lg: 72 } as const;

export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof avatarVariants> {
  /** Initials to show when there is no photo. */
  initials?: string;
  src?: string | null;
  alt?: string;
  /** Show the Figma photo placeholder glyph instead of initials. */
  placeholder?: boolean;
}

export function Avatar({ initials, src, alt = '', placeholder, size, tone, className, ...props }: AvatarProps) {
  const px = PX[size ?? 'md'];
  return (
    <span className={cn(avatarVariants({ size, tone }), className)} role={alt ? 'img' : undefined} aria-label={alt || undefined} {...props}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" width={px} height={px} className="size-full object-cover" />
      ) : placeholder || !initials ? (
        <AvatarPhotoPlaceholder size={px} />
      ) : (
        <span aria-hidden>{initials}</span>
      )}
    </span>
  );
}
