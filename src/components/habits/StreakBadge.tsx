import { cn } from '@/lib/utils'

export function StreakBadge({ streak, className }: { streak: number; className?: string }) {
  if (streak === 0) return null
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-full bg-ldg-green/10 text-ldg-green',
        className
      )}
    >
      🔥 {streak}
    </span>
  )
}
