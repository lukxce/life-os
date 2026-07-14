'use client'
import { useEffect, useState } from 'react'
import { formatRSD, formatEUR, Period, formatDate } from '@/lib/utils'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Card, Label, CHART_COLORS } from '@/components/ledger/primitives'
import { SignalsCard } from '@/components/finance/SignalsCard'
import { ArrowUp, ArrowDown, ArrowLeftRight } from 'lucide-react'

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
    <div className="max-w-5xl mx-auto space-y-4 pb-8">
      {/* ── Net worth ── */}
      <Card className="p-5">
        <Label>Net worth</Label>
        {data ? (
          <>
            <p className="font-mono text-[32px] tabular-nums tracking-tight leading-none mt-1">{formatEUR(data.totals.totalEUR)}</p>
            <p className="font-mono text-[12px] text-ldg-ink/55 mt-1">{formatRSD(data.totals.totalRSD)}</p>
            <div className="grid grid-cols-3 mt-4 border-t border-ldg-ink/[0.07] pt-3">
              <div>
                <p className="text-[11px] text-ldg-ink/55">Personal</p>
                <p className="font-mono text-[15px] font-semibold tabular-nums mt-0.5">{formatEUR(data.totals.personalEUR)}</p>
              </div>
              <div>
                <p className="text-[11px] text-ldg-ink/55">Company</p>
                <p className="font-mono text-[15px] font-semibold tabular-nums mt-0.5">{formatEUR(data.totals.companyEUR)}</p>
              </div>
              <div>
                <p className="text-[11px] text-ldg-ink/55">Out · {period === 'month' ? 'this month' : period}</p>
                <p className="font-mono text-[15px] font-semibold tabular-nums mt-0.5 text-ldg-urgent">{formatRSD(monthOut)}</p>
              </div>
            </div>
            <p className="font-mono text-[11px] text-ldg-ink/55 mt-3">EUR/RSD live {data.liveRate.toFixed(2)} · manual {data.manualRate.toFixed(2)}</p>
          </>
        ) : (
          <div className="h-36 flex items-center text-ldg-ink/40 animate-pulse">Loading…</div>
        )}
      </Card>

      <SignalsCard />

      {/* ── Period pills ── */}
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
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
              className={cn('shrink-0 text-[13px] px-3 py-1.5 rounded-lg border transition-colors',
                active ? 'font-semibold bg-ldg-green/10 text-ldg-green border-ldg-green/30'
                       : 'font-medium text-ldg-ink/55 border-ldg-ink/10')}>
              {s.label}
            </button>
          )
        })}
      </div>

      {/* ── Accounts: pinned ones only — the rest live behind "See all" ── */}
      {data && (() => {
        const pinned = data.accounts.filter((a: any) => a.pinned)
        const shown = pinned.length > 0 ? pinned : data.accounts
        const hiddenCount = data.accounts.length - shown.length
        return (
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <Label>Accounts</Label>
            <Link href="/finance/accounts" className="font-mono text-[12px] underline underline-offset-2 text-ldg-ink/55">
              {pinned.length > 0 ? `See all ${data.accounts.length} →` : 'Pin your favorites →'}
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x md:grid md:grid-cols-3 md:gap-3 md:overflow-visible md:mx-0 md:px-0 md:pb-0"
            style={{ scrollbarWidth: 'none' }}>
            {shown.map(acc => (
              <Card key={acc.id} className="snap-start shrink-0 w-[190px] md:w-auto p-4">
                <Label>{acc.name}</Label>
                <p className="font-mono text-[15px] font-semibold tabular-nums mt-1.5">
                  {acc.currency === 'EUR' ? formatEUR(acc.currentBalance) : formatRSD(acc.currentBalance)}
                </p>
                <p className="font-mono text-[12px] text-ldg-ink/55 tabular-nums">
                  {acc.currency === 'EUR' ? formatRSD(acc.balanceRSD) : formatEUR(acc.balanceEUR)}
                </p>
              </Card>
            ))}
          </div>
          {hiddenCount > 0 && (
            <p className="font-mono text-[12px] text-ldg-ink/55 mt-2 px-1">+{hiddenCount} more account{hiddenCount > 1 ? 's' : ''} hidden — pin the ones you use daily</p>
          )}
        </div>
        )
      })()}

      {/* ── Recent activity ── */}
      {recent.length > 0 && (
        <Card className="overflow-hidden">
          <div className="px-5 py-3.5 border-b border-ldg-ink/[0.07]">
            <Label>Recent activity</Label>
          </div>
          <div className="px-5">
            {recent.map(r => (
              <Link key={`${r.type}-${r.id}`} href={r.href}
                className="flex items-center gap-3 py-2.5 border-t border-ldg-ink/[0.07] first:border-t-0 hover:bg-ldg-ink/[0.02] transition-colors -mx-5 px-5">
                <span className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-ldg-ink/[0.06]">
                  {r.type === 'expense' ? <ArrowUp size={15} className="text-ldg-urgent" />
                    : r.type === 'income' ? <ArrowDown size={15} className="text-ldg-green" />
                    : <ArrowLeftRight size={14} className="text-ldg-ink/55" />}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] text-ldg-ink truncate">{r.label || r.sub}</p>
                  <p className="font-mono text-[12px] text-ldg-ink/55">{formatDate(r.date)}</p>
                </div>
                <span className={cn('font-mono text-[14px] tabular-nums shrink-0',
                  r.type === 'expense' ? 'text-ldg-urgent' : r.type === 'income' ? 'text-ldg-green' : 'text-ldg-ink/55')}>
                  {r.type === 'expense' ? '−' : r.type === 'income' ? '+' : ''}{r.amount.toLocaleString()}{r.currency ? ` ${r.currency}` : ''}
                </span>
              </Link>
            ))}
          </div>
        </Card>
      )}

      {/* ── Budgets ── */}
      {budgets.length > 0 && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <Label>Budgets · this month</Label>
            <Link href="/finance/budgets" className="font-mono text-[12px] underline underline-offset-2 text-ldg-ink/55">Manage</Link>
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
                const overBudget = pct >= 100
                return (
                  <div key={`${b.id}-${ri}`}>
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="text-[13px] font-semibold text-ldg-ink">{b.category}</span>
                      <span className={cn('font-mono text-[11px] tabular-nums', overBudget ? 'text-ldg-urgent font-bold' : 'text-ldg-ink/55')}>
                        {row.fmt(row.spent)} / {row.fmt(row.limit)} · {pct.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-[6px] rounded-full bg-ldg-ink/[0.07] overflow-hidden">
                      <div className={cn('h-full rounded-full transition-all duration-700', overBudget ? 'bg-ldg-urgent' : 'bg-ldg-green')} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })
            })}
          </div>
        </Card>
      )}

      {/* ── Spending ── */}
      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[
            { title: 'Personal spending', data: data.personalExpenses },
            { title: 'Business spending', data: data.businessExpenses },
          ].map(section => (
            <Card key={section.title} className="p-5">
              <Label>{section.title}</Label>
              {section.data.filter(e => e.amountRSD > 0).length === 0 ? (
                <p className="font-mono text-[12px] text-ldg-ink/55 text-center py-8">nothing this period</p>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={170}>
                    <PieChart>
                      <Pie data={section.data.filter(e => e.amountRSD > 0)} dataKey="amountRSD" nameKey="category"
                        cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} strokeWidth={0}>
                        {section.data.filter(e => e.amountRSD > 0).map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: any) => formatRSD(v)}
                        contentStyle={{ fontSize: 12, borderRadius: 12, border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-2">
                    {section.data.filter(e => e.amountRSD > 0).map((e, i) => (
                      <div key={e.category} className="flex items-center justify-between py-2 border-t border-ldg-ink/[0.07] first:border-t-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                          <span className="text-[14px] text-ldg-ink truncate">{e.category}</span>
                        </div>
                        <span className="font-mono text-[14px] text-ldg-ink shrink-0 ml-2 tabular-nums">{formatRSD(e.amountRSD)}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between pt-2 mt-1 border-t border-ldg-ink/[0.07]">
                      <span className="text-[14px] font-semibold text-ldg-ink">Total</span>
                      <span className="font-mono text-[14px] font-semibold tabular-nums text-ldg-urgent">
                        {formatRSD(section.data.reduce((s, e) => s + e.amountRSD, 0))}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* ── Saving goals ── */}
      {goals.length > 0 && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <Label>Saving goals</Label>
            <Link href="/finance/goals" className="font-mono text-[12px] underline underline-offset-2 text-ldg-ink/55">Manage</Link>
          </div>
          <div className="space-y-4">
            {goals.map((g: any) => {
              const pct = Math.min(100, g.pct ?? 0)
              return (
                <div key={g.id}>
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="text-[13px] font-semibold text-ldg-ink">{g.name}</span>
                    <span className="font-mono text-[11px] text-ldg-ink/55 tabular-nums">
                      {g.currency === 'EUR' ? '€' : ''}{g.saved.toLocaleString('en', { maximumFractionDigits: 0 })} / {g.currency === 'EUR' ? '€' : ''}{g.targetAmount.toLocaleString()} · {pct.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-[6px] rounded-full bg-ldg-ink/[0.07] overflow-hidden">
                    <div className="h-full rounded-full bg-ldg-green transition-all duration-700" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* ── Income ── */}
      {data && (
        <Card className="p-5">
          <Label>Income · {period === 'month' ? 'this month' : period}</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 mt-4 mb-4">
            {[
              { label: 'Salary', rsd: data.income.salaryRSD },
              { label: 'Invoice (RSD)', rsd: data.income.invoiceRSD },
              { label: 'Invoice (EUR)', rsd: data.income.invoiceEURinRSD },
              { label: 'Other (RSD)', rsd: data.income.otherRSD },
              { label: 'Other (EUR)', rsd: data.income.otherEURinRSD },
            ].map(row => (
              <div key={row.label} className="bg-ldg-paper rounded-lg p-3">
                <p className="text-[11px] text-ldg-ink/55">{row.label}</p>
                <p className="font-mono text-[14px] font-semibold mt-0.5 text-ldg-ink tabular-nums">{formatRSD(row.rsd)}</p>
                <p className="font-mono text-[11px] text-ldg-ink/55 tabular-nums">{formatEUR(row.rsd / data.liveRate)}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-ldg-ink/[0.07]">
            <div className="flex-1 bg-ldg-green/[0.07] border border-ldg-green/20 rounded-lg p-4 text-center">
              <p className="text-[11px] text-ldg-ink/55">Total net</p>
              <p className="font-mono text-[19px] font-bold text-ldg-green tabular-nums">{formatRSD(data.income.totalNetRSD)}</p>
              <p className="font-mono text-[11px] text-ldg-ink/55 tabular-nums">{formatEUR(data.income.totalNetEUR)}</p>
            </div>
            <div className="flex-1 bg-ldg-urgent/[0.07] border border-ldg-urgent/20 rounded-lg p-4 text-center">
              <p className="text-[11px] text-ldg-ink/55">Deductions</p>
              <p className="font-mono text-[19px] font-bold text-ldg-urgent tabular-nums">{formatRSD(data.income.totalDeductions)}</p>
            </div>
          </div>
        </Card>
      )}

      {loading && !data && (
        <div className="space-y-4">
          {[1,2,3].map(i => <div key={i} className="h-32 bg-ldg-ink/[0.05] rounded-2xl animate-pulse" />)}
        </div>
      )}
    </div>
  )
}
