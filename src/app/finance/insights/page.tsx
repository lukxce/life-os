'use client'
import { useEffect, useMemo, useState } from 'react'
import { TrendingUp, TrendingDown, Minus, ArrowUp, ArrowDown, ChevronDown, ChevronLeft } from 'lucide-react'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts'
import { formatRSD, type Period } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Card, Label, CHART_COLORS } from '@/components/ledger/primitives'

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

interface SubcategoryInsight {
  subcategory: string
  current: number
  previous: number
  delta: number
}

interface CategoryInsight {
  category: string
  current: number
  previous: number
  delta: number
  budgetRSD: number | null
  subcategories: SubcategoryInsight[]
}

interface InsightsData {
  period: Period
  type: 'all' | 'personal' | 'business'
  current: { start: string | null; end: string | null; total: number }
  previous: { start: string | null; end: string | null; total: number }
  totalDelta: number
  categories: CategoryInsight[]
  topMovers: CategoryInsight[]
}

const PERIOD_PILLS: { label: string; period: Period; offset: number }[] = [
  { label: 'Today',      period: 'day',   offset: 0 },
  { label: 'This Week',  period: 'week',  offset: 0 },
  { label: 'This Month', period: 'month', offset: 0 },
  { label: 'Last Month', period: 'month', offset: -1 },
  { label: 'This Year',  period: 'year',  offset: 0 },
  { label: 'All Time',   period: 'all',   offset: 0 },
]

function offsetDate(period: Period, offset: number): string {
  const d = new Date()
  if (offset) {
    if (period === 'month') d.setMonth(d.getMonth() + offset)
    else if (period === 'year') d.setFullYear(d.getFullYear() + offset)
    else if (period === 'week') d.setDate(d.getDate() + offset * 7)
    else if (period === 'day') d.setDate(d.getDate() + offset)
  }
  return d.toISOString().split('T')[0]
}

function periodLabel(period: Period, rangeStart: string | null): string {
  if (period === 'all') return 'All time'
  if (!rangeStart) return ''
  const d = new Date(rangeStart)
  if (period === 'month') return MONTH_NAMES[d.getMonth()]
  if (period === 'year') return String(d.getFullYear())
  if (period === 'week') return `Week of ${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function DeltaBadge({ delta }: { delta: number }) {
  if (delta === 0) return <span className="inline-flex items-center gap-0.5 text-xs text-ldg-ink/40"><Minus size={10} /> 0%</span>
  const up = delta > 0
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-xs font-medium', up ? 'text-ldg-urgent' : 'text-ldg-green')}>
      {up ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
      {Math.abs(delta)}%
    </span>
  )
}

function BudgetBar({ current, budget }: { current: number; budget: number }) {
  const pct = Math.min(Math.round((current / budget) * 100), 100)
  const over = current > budget
  return (
    <div className="mt-1.5">
      <div className="flex justify-between text-[10px] text-ldg-ink/55 mb-0.5">
        <span>{pct}% of budget</span>
        <span>{over ? 'Over budget!' : `${formatRSD(budget - current)} left`}</span>
      </div>
      <div className="h-[6px] bg-ldg-ink/[0.07] rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', over ? 'bg-ldg-urgent' : 'bg-ldg-green')} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function ComparisonBars({ current, previous, currentLabel, previousLabel, showLabels }: {
  current: number; previous: number; currentLabel: string; previousLabel: string; showLabels: boolean
}) {
  const maxVal = Math.max(current, previous, 1)
  const curPct = Math.round((current / maxVal) * 100)
  const prevPct = Math.round((previous / maxVal) * 100)
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-ldg-ink/40 w-14 shrink-0">{currentLabel}</span>
        <div className="flex-1 h-2 bg-ldg-ink/[0.06] rounded-full overflow-hidden">
          <div className="h-full bg-ldg-ink/20 rounded-full transition-all" style={{ width: `${curPct}%` }} />
        </div>
        <span className="text-[10px] text-ldg-ink/55 w-20 text-right shrink-0">{formatRSD(current)}</span>
      </div>
      {showLabels && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-ldg-ink/40 w-14 shrink-0">{previousLabel}</span>
          <div className="flex-1 h-2 bg-ldg-ink/[0.06] rounded-full overflow-hidden">
            <div className="h-full bg-ldg-ink/10 rounded-full transition-all" style={{ width: `${prevPct}%` }} />
          </div>
          <span className="text-[10px] text-ldg-ink/55 w-20 text-right shrink-0">{formatRSD(previous)}</span>
        </div>
      )}
    </div>
  )
}

export default function InsightsPage() {
  const [data, setData] = useState<InsightsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'all' | 'movers'>('all')
  const [activePill, setActivePill] = useState(2) // "This Month"
  const [type, setType] = useState<'all' | 'personal' | 'business'>('all')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [drill, setDrill] = useState<string | null>(null)

  const pill = PERIOD_PILLS[activePill]
  const date = offsetDate(pill.period, pill.offset)

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ period: pill.period, date, ...(type !== 'all' ? { type } : {}) })
    fetch(`/api/finance/insights?${params}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); setDrill(null) })
      .catch(() => setLoading(false))
  }, [pill.period, date, type])

  const hasComparison = data ? data.period !== 'all' : false

  const drillCategory = useMemo(() => data?.categories.find(c => c.category === drill) ?? null, [data, drill])
  const breakdownItems = useMemo(() => {
    if (!data) return []
    if (drillCategory) return drillCategory.subcategories.filter(s => s.current > 0).map(s => ({ key: s.subcategory, amount: s.current }))
    return data.categories.filter(c => c.current > 0).map(c => ({ key: c.category, amount: c.current }))
  }, [data, drillCategory])
  const breakdownTotal = breakdownItems.reduce((s, i) => s + i.amount, 0)

  if (loading && !data) return (
    <div className="max-w-4xl mx-auto space-y-4">
      {[1,2,3,4].map(i => <div key={i} className="h-20 bg-ldg-ink/[0.05] rounded-2xl animate-pulse" />)}
    </div>
  )

  if (!data) return <div className="text-center text-ldg-ink/40 py-20">Could not load insights.</div>

  const curLabel = periodLabel(data.period, data.current.start)
  const prevLabel = periodLabel(data.period, data.previous.start)

  const DirIcon = data.totalDelta > 0 ? TrendingUp : data.totalDelta < 0 ? TrendingDown : Minus
  const dirColor = data.totalDelta > 0 ? 'text-ldg-urgent' : data.totalDelta < 0 ? 'text-ldg-green' : 'text-ldg-ink/40'

  const shown = view === 'movers' ? data.topMovers : data.categories

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-8">
      <h2 className="text-2xl font-bold text-ldg-ink">Spending Insights</h2>

      {/* Filters */}
      <div className="space-y-2">
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {PERIOD_PILLS.map((p, i) => (
            <button key={p.label} onClick={() => setActivePill(i)}
              className={cn('shrink-0 text-[13px] px-3 py-1.5 rounded-lg border transition-colors',
                activePill === i ? 'font-semibold bg-ldg-green/10 text-ldg-green border-ldg-green/30'
                                  : 'font-medium text-ldg-ink/55 border-ldg-ink/10')}>
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-ldg-ink/[0.05] p-1 rounded-lg w-fit">
          {(['all', 'personal', 'business'] as const).map(t => (
            <button key={t} onClick={() => setType(t)}
              className={cn('px-3.5 py-1 rounded-md text-[13px] font-medium capitalize transition-colors',
                type === t ? 'bg-ldg-card text-ldg-ink shadow-sm' : 'text-ldg-ink/55 hover:text-ldg-ink')}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className={cn('grid grid-cols-1 gap-4', hasComparison ? 'sm:grid-cols-3' : 'sm:grid-cols-1')}>
        <Card className="p-4">
          <p className="text-xs text-ldg-ink/55 font-medium uppercase tracking-wide">{curLabel}</p>
          <p className="text-2xl font-bold text-ldg-ink mt-1">{formatRSD(data.current.total)}</p>
          {hasComparison && (
            <div className="flex items-center gap-1 mt-1">
              <DirIcon size={13} className={dirColor} />
              <span className={cn('text-sm font-medium', dirColor)}>
                {data.totalDelta > 0 ? '+' : ''}{data.totalDelta}% vs {prevLabel}
              </span>
            </div>
          )}
        </Card>

        {hasComparison && (
          <>
            <Card className="p-4">
              <p className="text-xs text-ldg-ink/55 font-medium uppercase tracking-wide">{prevLabel}</p>
              <p className="text-2xl font-bold text-ldg-ink mt-1">{formatRSD(data.previous.total)}</p>
              <p className="text-sm text-ldg-ink/40 mt-1">Baseline comparison</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-ldg-ink/55 font-medium uppercase tracking-wide">Difference</p>
              <p className={cn('text-2xl font-bold mt-1', data.current.total > data.previous.total ? 'text-ldg-urgent' : 'text-ldg-green')}>
                {data.current.total > data.previous.total ? '+' : ''}{formatRSD(data.current.total - data.previous.total)}
              </p>
              <p className="text-xs text-ldg-ink/40 mt-1">{data.categories.length} categories tracked</p>
            </Card>
          </>
        )}
      </div>

      {/* Breakdown: donut + list, drillable into subcategories */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-1">
          {drillCategory ? (
            <button onClick={() => setDrill(null)} className="flex items-center gap-1 text-[13px] font-semibold text-ldg-ink hover:text-ldg-green transition-colors">
              <ChevronLeft size={15} /> {drillCategory.category}
            </button>
          ) : (
            <Label>Breakdown · {curLabel}</Label>
          )}
        </div>
        {breakdownItems.length === 0 ? (
          <p className="font-mono text-[12px] text-ldg-ink/55 text-center py-8">nothing this period</p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={190}>
              <PieChart>
                <Pie data={breakdownItems} dataKey="amount" nameKey="key"
                  cx="50%" cy="50%" innerRadius={50} outerRadius={78} paddingAngle={3} strokeWidth={0}>
                  {breakdownItems.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => formatRSD(v)}
                  contentStyle={{ fontSize: 12, borderRadius: 12, border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-2">
              {breakdownItems.map((item, i) => (
                <button key={item.key}
                  onClick={() => !drillCategory && setDrill(item.key)}
                  disabled={!!drillCategory}
                  className={cn(
                    'w-full flex items-center justify-between py-2 border-t border-ldg-ink/[0.07] first:border-t-0 text-left',
                    !drillCategory && 'hover:bg-ldg-ink/[0.02] transition-colors -mx-1 px-1 rounded-md',
                  )}>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span className="text-[14px] text-ldg-ink truncate">{item.key}</span>
                  </div>
                  <span className="font-mono text-[14px] text-ldg-ink shrink-0 ml-2 tabular-nums">{formatRSD(item.amount)}</span>
                </button>
              ))}
              <div className="flex items-center justify-between pt-2 mt-1 border-t border-ldg-ink/[0.07]">
                <span className="text-[14px] font-semibold text-ldg-ink">Total</span>
                <span className="font-mono text-[14px] font-semibold tabular-nums text-ldg-urgent">{formatRSD(breakdownTotal)}</span>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* View toggle */}
      <div className="flex gap-1 bg-ldg-ink/[0.05] p-1 rounded-lg w-fit">
        {([['all', 'All Categories'], ['movers', 'Top Movers']] as const).map(([key, label]) => (
          <button key={key} onClick={() => setView(key)}
            className={cn('px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
              view === key ? 'bg-ldg-card text-ldg-ink shadow-sm' : 'text-ldg-ink/55 hover:text-ldg-ink')}>
            {label}
          </button>
        ))}
      </div>

      {/* Category comparison, expandable to subcategories */}
      {shown.length === 0 ? (
        <Card className="p-8 text-center text-ldg-ink/40">
          No expense data for {curLabel}{hasComparison ? ` or ${prevLabel}` : ''}
        </Card>
      ) : (
        <div className="space-y-3">
          {shown.map(cat => {
            const isOpen = !!expanded[cat.category]
            const hasSubs = cat.subcategories.some(s => s.current > 0 || s.previous > 0)
            return (
              <Card key={cat.category} className="p-4">
                <button
                  onClick={() => hasSubs && setExpanded(e => ({ ...e, [cat.category]: !e[cat.category] }))}
                  className="w-full flex items-start justify-between gap-3 mb-2 text-left">
                  <div className="flex items-center gap-1.5">
                    {hasSubs && <ChevronDown size={14} className={cn('text-ldg-ink/40 shrink-0 transition-transform', isOpen && 'rotate-180')} />}
                    <span className="font-semibold text-ldg-ink">{cat.category}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-ldg-ink text-sm">{formatRSD(cat.current)}</p>
                    {hasComparison && <DeltaBadge delta={cat.delta} />}
                  </div>
                </button>

                <ComparisonBars current={cat.current} previous={cat.previous}
                  currentLabel={curLabel.slice(0, 8)} previousLabel={prevLabel.slice(0, 8)} showLabels={hasComparison} />

                {cat.budgetRSD != null && cat.budgetRSD > 0 && <BudgetBar current={cat.current} budget={cat.budgetRSD} />}

                {isOpen && hasSubs && (
                  <div className="mt-3 pt-3 border-t border-ldg-ink/[0.07] space-y-3 pl-4">
                    {cat.subcategories.filter(s => s.current > 0 || s.previous > 0).map(sub => (
                      <div key={sub.subcategory}>
                        <div className="flex items-start justify-between gap-3 mb-1">
                          <span className="text-[13px] text-ldg-ink/70">{sub.subcategory}</span>
                          <div className="text-right shrink-0">
                            <p className="text-[13px] font-medium text-ldg-ink">{formatRSD(sub.current)}</p>
                            {hasComparison && <DeltaBadge delta={sub.delta} />}
                          </div>
                        </div>
                        <ComparisonBars current={sub.current} previous={sub.previous}
                          currentLabel={curLabel.slice(0, 8)} previousLabel={prevLabel.slice(0, 8)} showLabels={hasComparison} />
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
