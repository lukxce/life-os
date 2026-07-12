'use client'
import { cn } from '@/lib/utils'

// ── Ledger primitives ──────────────────────────────────────────────────────
// The shared building blocks of the decided app-wide design language: cool
// neutrals, one saturated accent (green), hairline rules, tabular mono
// numerals. Pure Tailwind classes against the ldg-* tokens (globals.css +
// tailwind.config.js) — no inline style objects, so these respond to
// dark mode automatically via the existing .dark class next-themes toggles.

export function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn('text-[11px] font-semibold uppercase tracking-[0.14em] text-ldg-ink/55', className)}>
      {children}
    </p>
  )
}

export function Card({
  children, className, accent, as: As = 'section',
}: { children: React.ReactNode; className?: string; accent?: 'urgent' | 'green'; as?: 'section' | 'div' }) {
  // Accent border-left uses an inline color, not a Tailwind border-l-{color}
  // class — directional-prefix ambiguity is exactly what "ldg-" avoids
  // everywhere else, no reason to reintroduce it here
  const accentColor = accent === 'urgent' ? 'rgb(var(--l-urgent))' : accent === 'green' ? 'rgb(var(--l-green))' : undefined
  return (
    <As className={cn(
      'rounded-2xl bg-ldg-card border border-ldg-ink/10 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.35)]',
      accent && 'border-l-[3px]',
      className,
    )} style={accentColor ? { borderLeftColor: accentColor } : undefined}>
      {children}
    </As>
  )
}

export function SolidBtn({ onClick, children, className, type = 'button' }: {
  onClick?: () => void; children: React.ReactNode; className?: string; type?: 'button' | 'submit'
}) {
  return (
    <button type={type} onClick={onClick}
      className={cn('text-[13px] font-semibold text-white bg-ldg-green px-3.5 py-1.5 rounded-lg shrink-0 active:scale-95 transition-transform', className)}>
      {children}
    </button>
  )
}

export function GhostBtn({ onClick, children, className }: { onClick?: () => void; children: React.ReactNode; className?: string }) {
  return (
    <button onClick={onClick}
      className={cn('text-[13px] font-medium text-ldg-ink/55 px-3 py-1.5 rounded-lg shrink-0 border border-ldg-ink/10 hover:bg-ldg-ink/[0.04] transition-colors', className)}>
      {children}
    </button>
  )
}

export function Rule() {
  return <div className="border-t border-ldg-ink/[0.07]" />
}

export function Row({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('flex items-center gap-3 py-2.5 border-t border-ldg-ink/[0.07]', className)}>{children}</div>
}
