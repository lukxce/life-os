'use client'
import { useEffect, useState } from 'react'
import { formatRSD, formatEUR, Period, formatDate } from '@/lib/utils'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { HeroStat } from '@/components/ui/synth'

const COLORS = ['#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#06B6D4']

type DashboardData = {
  liveRate: number
  manualRate: number
  accounts: any[]
  totals: any
  income: any
  personalExpenses: { category: string; amountRSD: number }[]
  businessExpenses: { category: string; amountRSD: number }[]
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [period, setPeriod] = useState<Period>('month')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(true)
  const [recent, setRecent] = useState<any[]>([])
  const [budgets, setBudgets] = useState<any[]>([])
  const [goals, setGoals] = useState<any[]>([])
  const [monthSpent, setMonthSpent] = useState<Record<string, { rsd: number; eur: number }>>({})

  useEffect(() => {
    setLoading(true)
    fetch(`/api/finance/dashboard?period=${period}&date=${date}`)
      .then(r => r.json()).then(json => { setData(json); setLoading(false) })
      .catch(() => setLoading(false))
  }, [period, date])

  useEffect(() => { fetch('/api/finance/recent?limit=6').then(r => r.json()).then(setRecent).catch(() => {}) }, [])
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    Promise.all([
      fetch('/api/finance/budgets').then(r => r.json()),
      fetch('/api/finance/goals').then(r => r.json()),
      fetch(`/api/finance/expenses?period=month&date=${today}`).then(r => r.json()),
    ]).then(([b, g, expenses]) => {
      setBudgets(Array.isArray(b) ? b : [])
      setGoals(Array.isArray(g) ? g : [])
      const spent: Record<string, { rsd: number; eur: number }> = {}
      if (Array.isArray(expenses)) {
        for (const e of expenses) {
          if (!spent[e.category]) spent[e.category] = { rsd: 0, eur: 0 }
          if (e.currency === 'EUR') spent[e.category].eur += e.amount
          else spent[e.category].rsd += e.amount
        }
      }
      setMonthSpent(spent)
    }).catch(() => {})
  }, [])

  const monthOut = data ? data.personalExpenses.concat(data.businessExpenses).reduce((s, e) => s + e.amountRSD, 0) : 0

  return (
    <div className="-mx-4 -mt-6 md:-mx-6 md:-mt-8 max-w-none">
      {/* ── Hero: net worth, synthesized ── */}
      <div className="relative overflow-hidden rounded-b-[2rem] bg-[#1f1815] text-white px-5 pt-8 pb-6 md:px-8">
        <div aria-hidden className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(640px 420px at 88% -20%, rgba(232,120,90,0.4), transparent 65%), radial-gradient(520px 400px at -10% 115%, rgba(220,161,84,0.2), transparent 60%)' }} />
        <div className="relative max-w-5xl mx-auto">
          <p className="text-[10px] font-bold tracking-[0.2em] text-white/40 uppercase">Net worth</p>
          {data ? (
            <>
              <p className="text-4xl md:text-5xl font-bold mt-1 tabular-nums">{formatEUR(data.totals.totalEUR)}</p>
              <p className="text-sm text-white/50 mt-1 tabular-nums">{formatRSD(data.totals.totalRSD)}</p>
              <div className="grid grid-cols-3 gap-4 mt-6">
                <HeroStat label="Personal" value={formatEUR(data.totals.personalEUR)} />
                <HeroStat label="Company"  value={formatEUR(data.totals.companyEUR)} />
                <HeroStat label={`Out · ${period === 'month' ? 'this month' : period}`}
                  value={<span className="text-red-400">{formatRSD(monthOut)}</span>} />
              </div>
              <p className="text-[10px] text-white/30 mt-5">EUR/RSD live {data.liveRate.toFixed(2)} · manual {data.manualRate.toFixed(2)}</p>
            </>
          ) : (
            <div className="h-36 flex items-center text-white/40 animate-pulse">Loading…</div>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-6 space-y-6 pt-4 pb-8">

        {/* ── Period pills ── */}
        <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {[
            { label: 'Today',      period: 'day'   as Period, offset: 0 },
            { label: 'This Week',  period: 'week'  as Period, offset: 0 },
            { label: 'This Month', period: 'month' as Period, offset: 0 },
            { label: 'Last Month', period: 'month' as Period, offset: -1 },
            { label: 'YTD',        period: 'year'  as Period, offset: 0 },
            { label: 'All Time',   period: 'all'   as Period, offset: 0 },
          ].map(s => {
            const d = new Date()
            if (s.offset) d.setMonth(d.getMonth() + s.offset)
            const dStr = d.toISOString().split('T')[0]
            const active = period === s.period && (s.period === 'all' || date === dStr)
            return (
              <button key={s.label}
                onClick={() => { setPeriod(s.period); setDate(dStr) }}
                className={cn('shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors',
                  active ? 'bg-[rgb(232,120,90)] text-white'
                         : 'bg-surface/90 dark:bg-surface/70 text-gray-500 dark:text-gray-400 border border-black/5 dark:border-white/5')}>
                {s.label}
              </button>
            )
          })}
        </div>

        {/* ── Accounts: wallet-style scroll ── */}
        {data && (
          <div>
            <div className="flex items-center justify-between mb-2 px-1">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">Accounts</h3>
              <Link href="/finance/accounts" className="text-xs text-[rgb(232,120,90)] dark:text-[rgb(232,120,90)] hover:underline">Manage</Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 snap-x" style={{ scrollbarWidth: 'none' }}>
              {data.accounts.map(acc => {
                const isCompany = acc.type === 'company'
                const isCrypto = acc.name.toLowerCase().includes('crypto')
                return (
                  <div key={acc.id}
                    className={cn('snap-start shrink-0 w-[190px] rounded-2xl p-4 text-white shadow-md',
                      isCrypto ? 'bg-gradient-to-br from-amber-500 to-orange-600'
                        : isCompany ? 'bg-gradient-to-br from-purple-600 to-violet-700'
                        : 'bg-gradient-to-br from-blue-600 to-blue-700')}>
                    <p className="text-[11px] font-medium text-white/70 truncate">{acc.name}</p>
                    <p className="text-xl font-bold mt-3 tabular-nums">
                      {acc.currency === 'EUR' ? formatEUR(acc.currentBalance) : formatRSD(acc.currentBalance)}
                    </p>
                    <p className="text-[11px] text-white/60 tabular-nums">
                      {acc.currency === 'EUR' ? formatRSD(acc.balanceRSD) : formatEUR(acc.balanceEUR)}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Recent activity ── */}
        {recent.length > 0 && (
          <div className="bg-surface/90 dark:bg-surface/70 rounded-2xl border border-black/5 dark:border-white/5 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-black/5 dark:border-white/5 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Recent activity</h3>
            </div>
            <div className="divide-y divide-black/5 dark:divide-white/5">
              {recent.map(r => (
                <Link key={`${r.type}-${r.id}`} href={r.href}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors">
                  <span className={cn('w-9 h-9 rounded-full flex items-center justify-center text-sm shrink-0',
                    r.type === 'expense' ? 'bg-red-500/10 text-red-500' : r.type === 'income' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-gray-500/10 text-gray-400')}>
                    {r.type === 'expense' ? '↑' : r.type === 'income' ? '↓' : '⇄'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{r.label || r.sub}</p>
                    <p className="text-xs text-gray-400">{formatDate(r.date)}</p>
                  </div>
                  <span className={cn('text-sm font-semibold tabular-nums shrink-0',
                    r.type === 'expense' ? 'text-red-500' : r.type === 'income' ? 'text-emerald-500' : 'text-gray-500')}>
                    {r.type === 'expense' ? '−' : r.type === 'income' ? '+' : ''}{r.amount.toLocaleString()}{r.currency ? ` ${r.currency}` : ''}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── Budgets ── */}
        {budgets.length > 0 && (
          <div className="bg-surface/90 dark:bg-surface/70 rounded-2xl border border-black/5 dark:border-white/5 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Budgets · this month</h3>
              <Link href="/finance/budgets" className="text-xs text-[rgb(232,120,90)] dark:text-[rgb(232,120,90)] hover:underline">Manage</Link>
            </div>
            <div className="space-y-4">
              {budgets.map(b => {
                const s = monthSpent[b.category] ?? { rsd: 0, eur: 0 }
                const rows = [
                  b.amountRSD ? { spent: s.rsd, limit: b.amountRSD, fmt: (v: number) => `${v.toLocaleString()} RSD` } : null,
                  b.amountEUR ? { spent: s.eur, limit: b.amountEUR, fmt: (v: number) => `€${v.toLocaleString()}` } : null,
                ].filter(Boolean) as { spent: number; limit: number; fmt: (v: number) => string }[]
                return rows.map((row, ri) => {
                  const pct = Math.min(100, (row.spent / row.limit) * 100)
                  const color = pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-400' : 'bg-emerald-500'
                  return (
                    <div key={`${b.id}-${ri}`}>
                      <div className="flex justify-between items-baseline mb-1">
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{b.category}</span>
                        <span className={cn('text-[11px] tabular-nums',
                          pct >= 100 ? 'text-red-500 font-bold' : pct >= 80 ? 'text-amber-500 font-bold' : 'text-gray-400')}>
                          {row.fmt(row.spent)} / {row.fmt(row.limit)} · {pct.toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-2 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
                        <div className={cn('h-full rounded-full transition-all duration-700', color)} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })
              })}
            </div>
          </div>
        )}

        {/* ── Spending ── */}
        {data && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[
              { title: 'Personal spending', data: data.personalExpenses, color: 'text-red-500' },
              { title: 'Business spending', data: data.businessExpenses, color: 'text-purple-500' },
            ].map(section => (
              <div key={section.title} className="bg-surface/90 dark:bg-surface/70 rounded-2xl border border-black/5 dark:border-white/5 p-5">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">{section.title}</h3>
                {section.data.filter(e => e.amountRSD > 0).length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">Nothing this period</p>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={170}>
                      <PieChart>
                        <Pie data={section.data.filter(e => e.amountRSD > 0)} dataKey="amountRSD" nameKey="category"
                          cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} strokeWidth={0}>
                          {section.data.filter(e => e.amountRSD > 0).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v: any) => formatRSD(v)}
                          contentStyle={{ fontSize: 12, borderRadius: 12, border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-1.5 mt-2">
                      {section.data.filter(e => e.amountRSD > 0).map((e, i) => (
                        <div key={e.category} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                            <span className="text-gray-600 dark:text-gray-300 truncate text-[13px]">{e.category}</span>
                          </div>
                          <span className="font-medium text-gray-900 dark:text-gray-100 shrink-0 ml-2 text-[13px] tabular-nums">{formatRSD(e.amountRSD)}</span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between text-sm font-bold pt-2 mt-1 border-t border-black/5 dark:border-white/5">
                        <span className="text-gray-700 dark:text-gray-200">Total</span>
                        <span className={cn('tabular-nums', section.color)}>
                          {formatRSD(section.data.reduce((s, e) => s + e.amountRSD, 0))}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Saving goals ── */}
        {goals.length > 0 && (
          <div className="bg-surface/90 dark:bg-surface/70 rounded-2xl border border-black/5 dark:border-white/5 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Saving goals</h3>
              <Link href="/finance/goals" className="text-xs text-[rgb(232,120,90)] dark:text-[rgb(232,120,90)] hover:underline">Manage</Link>
            </div>
            <div className="space-y-4">
              {goals.map((g: any) => {
                const pct = Math.min(100, g.pct ?? 0)
                return (
                  <div key={g.id}>
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{g.name}</span>
                      <span className="text-[11px] text-gray-400 tabular-nums">
                        {g.currency === 'EUR' ? '€' : ''}{g.saved.toLocaleString('en', { maximumFractionDigits: 0 })} / {g.currency === 'EUR' ? '€' : ''}{g.targetAmount.toLocaleString()} · {pct.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-2 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
                      <div className={cn('h-full rounded-full transition-all duration-700', pct >= 100 ? 'bg-emerald-500' : 'bg-blue-500')} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Income ── */}
        {data && (
          <div className="bg-surface/90 dark:bg-surface/70 rounded-2xl border border-black/5 dark:border-white/5 p-5">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Income · {period === 'month' ? 'this month' : period}</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 mb-4">
              {[
                { label: 'Salary', rsd: data.income.salaryRSD },
                { label: 'Invoice (RSD)', rsd: data.income.invoiceRSD },
                { label: 'Invoice (EUR)', rsd: data.income.invoiceEURinRSD },
                { label: 'Other (RSD)', rsd: data.income.otherRSD },
                { label: 'Other (EUR)', rsd: data.income.otherEURinRSD },
              ].map(row => (
                <div key={row.label} className="bg-black/[0.03] dark:bg-white/[0.04] rounded-xl p-3">
                  <p className="text-[11px] text-gray-400">{row.label}</p>
                  <p className="text-sm font-semibold mt-0.5 text-gray-900 dark:text-gray-100 tabular-nums">{formatRSD(row.rsd)}</p>
                  <p className="text-[11px] text-gray-400 tabular-nums">{formatEUR(row.rsd / data.liveRate)}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-black/5 dark:border-white/5">
              <div className="flex-1 bg-emerald-500/10 rounded-xl p-4 text-center">
                <p className="text-[11px] text-gray-500 dark:text-gray-400">Total net</p>
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{formatRSD(data.income.totalNetRSD)}</p>
                <p className="text-[11px] text-gray-400 tabular-nums">{formatEUR(data.income.totalNetEUR)}</p>
              </div>
              <div className="flex-1 bg-red-500/10 rounded-xl p-4 text-center">
                <p className="text-[11px] text-gray-500 dark:text-gray-400">Deductions</p>
                <p className="text-xl font-bold text-red-500 tabular-nums">{formatRSD(data.income.totalDeductions)}</p>
              </div>
            </div>
          </div>
        )}

        {loading && !data && (
          <div className="space-y-4">
            {[1,2,3].map(i => <div key={i} className="h-32 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse" />)}
          </div>
        )}
      </div>
    </div>
  )
}
