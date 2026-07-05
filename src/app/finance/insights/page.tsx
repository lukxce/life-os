'use client'
import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown, Minus, ArrowUp, ArrowDown } from 'lucide-react'
import { formatRSD } from '@/lib/utils'
import { cn } from '@/lib/utils'

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

interface CategoryInsight {
  category: string
  current: number
  previous: number
  delta: number
  budgetRSD: number | null
}

interface InsightsData {
  thisMonth: { start: string; end: string; total: number }
  lastMonth: { start: string; end: string; total: number }
  totalDelta: number
  categories: CategoryInsight[]
  topMovers: CategoryInsight[]
}

function DeltaBadge({ delta }: { delta: number }) {
  if (delta === 0) return <span className="inline-flex items-center gap-0.5 text-xs text-gray-400"><Minus size={10} /> 0%</span>
  const up = delta > 0
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-xs font-medium', up ? 'text-red-500' : 'text-green-600')}>
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
      <div className="flex justify-between text-[10px] text-gray-400 mb-0.5">
        <span>{pct}% of budget</span>
        <span>{over ? 'Over budget!' : `${formatRSD(budget - current)} left`}</span>
      </div>
      <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', over ? 'bg-red-500' : pct > 80 ? 'bg-amber-500' : 'bg-emerald-500')}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export default function InsightsPage() {
  const [data, setData] = useState<InsightsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'all' | 'movers'>('all')

  useEffect(() => {
    fetch('/api/finance/insights')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="max-w-4xl mx-auto space-y-4">
      {[1,2,3,4].map(i => <div key={i} className="h-20 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />)}
    </div>
  )

  if (!data) return <div className="text-center text-gray-400 py-20">Could not load insights.</div>

  const now = new Date()
  const prevDate = new Date(data.lastMonth.start)
  const thisLabel = MONTH_NAMES[now.getMonth()]
  const prevLabel = MONTH_NAMES[prevDate.getMonth()]

  const DirIcon = data.totalDelta > 0 ? TrendingUp : data.totalDelta < 0 ? TrendingDown : Minus
  const dirColor = data.totalDelta > 0 ? 'text-red-500' : data.totalDelta < 0 ? 'text-emerald-500' : 'text-gray-400'

  const shown = view === 'movers' ? data.topMovers : data.categories

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Spending Insights</h2>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-black/10 dark:border-white/10 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">{thisLabel} (this month)</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{formatRSD(data.thisMonth.total)}</p>
          <div className="flex items-center gap-1 mt-1">
            <DirIcon size={13} className={dirColor} />
            <span className={cn('text-sm font-medium', dirColor)}>
              {data.totalDelta > 0 ? '+' : ''}{data.totalDelta}% vs {prevLabel}
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-black/10 dark:border-white/10 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">{prevLabel} (last month)</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{formatRSD(data.lastMonth.total)}</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Baseline comparison</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-black/10 dark:border-white/10 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">Difference</p>
          <p className={cn('text-2xl font-bold mt-1', data.thisMonth.total > data.lastMonth.total ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400')}>
            {data.thisMonth.total > data.lastMonth.total ? '+' : ''}{formatRSD(data.thisMonth.total - data.lastMonth.total)}
          </p>
          <p className="text-xs text-gray-400 mt-1">{data.categories.length} categories tracked</p>
        </div>
      </div>

      {/* View toggle */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
        {([['all', 'All Categories'], ['movers', 'Top Movers']] as const).map(([key, label]) => (
          <button key={key} onClick={() => setView(key)}
            className={cn('px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
              view === key ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200')}>
            {label}
          </button>
        ))}
      </div>

      {/* Category breakdown */}
      {shown.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-black/10 dark:border-white/10 p-8 text-center text-gray-400">
          No expense data for {thisLabel} or {prevLabel}
        </div>
      ) : (
        <div className="space-y-3">
          {shown.map(cat => {
            const maxVal = Math.max(cat.current, cat.previous, 1)
            const thisPct = Math.round((cat.current / maxVal) * 100)
            const lastPct = Math.round((cat.previous / maxVal) * 100)
            return (
              <div key={cat.category} className="bg-white dark:bg-gray-900 rounded-xl border border-black/10 dark:border-white/10 p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{cat.category}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{formatRSD(cat.current)}</p>
                    <DeltaBadge delta={cat.delta} />
                  </div>
                </div>

                {/* Comparison bars */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-400 w-14 shrink-0">{thisLabel.slice(0, 3)}</span>
                    <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${thisPct}%` }} />
                    </div>
                    <span className="text-[10px] text-gray-500 w-20 text-right shrink-0">{formatRSD(cat.current)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-400 w-14 shrink-0">{prevLabel.slice(0, 3)}</span>
                    <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-gray-300 dark:bg-gray-600 rounded-full transition-all" style={{ width: `${lastPct}%` }} />
                    </div>
                    <span className="text-[10px] text-gray-500 w-20 text-right shrink-0">{formatRSD(cat.previous)}</span>
                  </div>
                </div>

                {/* Budget bar */}
                {cat.budgetRSD != null && cat.budgetRSD > 0 && (
                  <BudgetBar current={cat.current} budget={cat.budgetRSD} />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
