import { cn } from '@/lib/utils'

type VisibilityBadgeProps = {
  variant: 'draft' | 'unpublished'
  className?: string
}

const LABELS: Record<VisibilityBadgeProps['variant'], string> = {
  draft: '초안',
  unpublished: '비공개 원문',
}

export function VisibilityBadge({ variant, className }: VisibilityBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide',
        variant === 'draft'
          ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
          : 'border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300',
        className,
      )}
    >
      {LABELS[variant]}
    </span>
  )
}

