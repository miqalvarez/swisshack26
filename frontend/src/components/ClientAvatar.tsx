import { cn } from '@/lib/utils'
import { initials } from '@/lib/format'

const sizes = {
  sm: 'size-8 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-14 text-base',
}

/**
 * Neutral client monogram, matching the SIX reference UI (light gray disc,
 * dark initials). `accent` is kept for optional future use but the reference
 * palette uses uniform neutral avatars.
 */
export function ClientAvatar({
  name,
  size = 'md',
  className,
}: {
  name: string
  accent?: string | null
  size?: keyof typeof sizes
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full border border-border bg-muted font-display font-semibold text-foreground',
        sizes[size],
        className,
      )}
      aria-hidden
    >
      {initials(name)}
    </div>
  )
}
