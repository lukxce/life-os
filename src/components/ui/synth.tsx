'use client'
import { cn } from '@/lib/utils'

// ── Whoop-style data synthesis primitives ─────────────────────────────────────
// Graded colors: the score itself carries meaning at a glance.

// Graded but never alarming — the lowest bracket is warm terracotta, not a
// stop-sign red. This is a deliberate brand choice: momentum, not guilt.
export function grade(pct: number) {
  if (pct >= 100) return { stroke: '#34d399', text: 'text-emerald-500', chip: 'bg-emerald-500/15 text-emerald-500' }
  if (pct >= 70)  return { stroke: '#4ade80', text: 'text-green-500',   chip: 'bg-green-500/15 text-green-500' }
  if (pct >= 40)  return { stroke: 'rgb(var(--amber))', text: 'text-amber-600', chip: 'bg-amber-500/15 text-amber-600' }
  return              { stroke: 'rgb(var(--coral))', text: 'text-[rgb(var(--coral))]', chip: 'bg-[rgb(var(--coral))]/15 text-[rgb(var(--coral))]' }
}

/** Big graded progress ring with the value front and center */
export function ScoreRing({
  value, size = 128, stroke = 11, sub, display, color, track = 'rgba(128,128,128,0.15)',
}: {
  value: number          // 0–100
  size?: number
  stroke?: number
  sub?: string           // small label under the number
  display?: string       // override the center number (e.g. "1,907")
  color?: string         // override graded color
  track?: string
}) {
  const pct = Math.max(0, Math.min(value, 100))
  const g = grade(pct)
  const R = (size - stroke) / 2
  const C = 2 * Math.PI * R
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={R} fill="none" strokeWidth={stroke} stroke={track} />
        <circle cx={size / 2} cy={size / 2} r={R} fill="none" strokeWidth={stroke} strokeLinecap="round"
          stroke={color ?? g.stroke}
          strokeDasharray={C} strokeDashoffset={C * (1 - pct / 100)}
          style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(0.25, 0.1, 0.25, 1), stroke 0.4s' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-bold leading-none tabular-nums"
          style={{ fontSize: size * 0.26, color: color ?? g.stroke }}>
          {display ?? `${Math.round(pct)}%`}
        </span>
        {sub && <span className="text-[10px] font-semibold uppercase tracking-wider opacity-50 mt-1">{sub}</span>}
      </div>
    </div>
  )
}

/** N-day mini bar trend, graded per bar; optional tap-to-select */
export function TrendBars({
  days, selected, onSelect, height = 44,
}: {
  days: { date: string; score: number }[]
  selected?: string
  onSelect?: (date: string) => void
  height?: number
}) {
  return (
    <div className="flex items-end gap-[3px] w-full" style={{ height }}>
      {days.map(d => {
        const g = grade(d.score)
        const h = Math.max(4, (d.score / 100) * height)
        const isSel = selected === d.date
        return (
          <button key={d.date} type="button" onClick={() => onSelect?.(d.date)}
            disabled={!onSelect}
            className="flex-1 flex flex-col items-center justify-end h-full group"
            title={`${d.date} — ${d.score}%`}>
            <span className={cn('w-full rounded-full transition-all', isSel && 'ring-2 ring-white/70')}
              style={{ height: h, background: g.stroke, opacity: isSel ? 1 : 0.75 }} />
          </button>
        )
      })}
    </div>
  )
}

/** Signed delta chip: +12% green, −8% red */
export function Delta({ value, suffix = '%' }: { value: number; suffix?: string }) {
  if (value === 0) return <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-gray-500/15 text-gray-400">=</span>
  const up = value > 0
  return (
    <span className={cn('text-[11px] font-bold px-1.5 py-0.5 rounded-md tabular-nums',
      up ? 'bg-emerald-500/15 text-emerald-500' : 'bg-red-500/15 text-red-400')}>
      {up ? '▲' : '▼'} {Math.abs(value)}{suffix}
    </span>
  )
}

/** Compact hero stat: tiny label on top, bold value, optional context line */
export function HeroStat({ label, value, sub, className }: { label: string; value: React.ReactNode; sub?: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <p className="text-[10px] font-bold uppercase tracking-widest opacity-50">{label}</p>
      <div className="text-lg font-bold leading-tight mt-0.5 tabular-nums">{value}</div>
      {sub && <div className="text-[11px] opacity-60 mt-0.5">{sub}</div>}
    </div>
  )
}
