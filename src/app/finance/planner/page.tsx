'use client'
import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Sparkles, SlidersHorizontal } from 'lucide-react'
import { NumberInput } from '@/components/ui/NumberInput'
import { Card, Label, CHART_COLORS } from '@/components/ledger/primitives'
import { cn } from '@/lib/utils'

const HORIZON_OPTIONS = [1, 3, 6, 12]
const AVG_MONTHS = 3
const COLORS = CHART_COLORS

type CategoryRow = { category: string; amount: string }

function calcMonthlyAvg(expenses: any[], category: string, months: number, currency: string, rate: number): number {
  const total = expenses
    .filter(e => e.category === category)
    .reduce((s, e) => {
      const amtRSD = e.amountRSD ?? 0
      return s + (currency === 'EUR' ? amtRSD / rate : amtRSD)
    }, 0)
  return Math.round(total / months)
}

export default function PlannerPage() {
  const [income, setIncome] = useState('')
  const [horizon, setHorizon] = useState(3)
  const [currency, setCurrency] = useState<'RSD' | 'EUR'>('RSD')
  const [mode, setMode] = useState<'auto' | 'manual'>('auto')
  const [rows, setRows] = useState<CategoryRow[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [avgExpenses, setAvgExpenses] = useState<Record<string, number>>({})
  const [rate, setRate] = useState(117.5)
  const [currentTotals, setCurrentTotals] = useState<{ totalEUR: number; totalRSD: number; personalEUR: number; companyEUR: number } | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      const now = new Date()
      const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - AVG_MONTHS, 1)
      const today = now.toISOString().split('T')[0]

      const [cats, expenses, settings, dashboard] = await Promise.all([
        fetch('/api/finance/categories?type=personal').then(r => r.json()),
        fetch('/api/finance/expenses?type=personal&period=all').then(r => r.json()),
        fetch('/api/settings').then(r => r.json()),
        fetch(`/api/finance/dashboard?period=all&date=${today}`).then(r => r.json()),
      ])

      const liveRate = dashboard?.liveRate ?? settings?.manualRate ?? 117.5
      setRate(liveRate)
      setCurrentTotals(dashboard?.totals ?? null)

      const catNames: string[] = Array.isArray(cats) ? cats.map((c: any) => c.name) : []
      setCategories(catNames)

      const recent = Array.isArray(expenses)
        ? expenses.filter(e => new Date(e.date) >= threeMonthsAgo)
        : []

      const avgs: Record<string, number> = {}
      for (const cat of catNames) {
        avgs[cat] = calcMonthlyAvg(recent, cat, AVG_MONTHS, currency, liveRate)
      }
      setAvgExpenses(avgs)
      setRows(catNames.map(cat => ({ category: cat, amount: String(avgs[cat] ?? 0) })))
      setLoading(false)
    }
    fetchData()
  }, [])

  // Recalculate averages when currency changes
  const switchCurrency = (c: 'RSD' | 'EUR') => {
    setCurrency(c)
    const converted: Record<string, number> = {}
    for (const cat of categories) {
      const rsdAvg = avgExpenses[cat] ?? 0
      converted[cat] = c === 'EUR' ? Math.round(rsdAvg / rate) : Math.round(rsdAvg * rate)
    }
    if (mode === 'auto') {
      setRows(categories.map(cat => ({ category: cat, amount: String(converted[cat] ?? 0) })))
    }
  }

  const switchMode = (m: 'auto' | 'manual') => {
    setMode(m)
    if (m === 'auto') {
      setRows(categories.map(cat => ({ category: cat, amount: String(avgExpenses[cat] ?? 0) })))
    } else {
      setRows(categories.map(cat => ({ category: cat, amount: '' })))
    }
  }

  const updateRow = (category: string, amount: string) => {
    setRows(prev => prev.map(r => r.category === category ? { ...r, amount } : r))
  }

  const sym = currency === 'EUR' ? '€' : ''
  const unit = currency
  const incomeNum = +income || 0
  const totalSpend = rows.reduce((s, r) => s + (+r.amount || 0), 0)
  const monthlySurplus = incomeNum - totalSpend
  const totalSaved = monthlySurplus * horizon
  const savingsRate = incomeNum > 0 ? Math.max(0, (monthlySurplus / incomeNum) * 100) : 0

  // Convert surplus to both currencies for totals impact
  const surplusInEUR = currency === 'EUR' ? monthlySurplus : monthlySurplus / rate
  const surplusInRSD = currency === 'RSD' ? monthlySurplus : monthlySurplus * rate

  const projectedTotalEUR = currentTotals ? currentTotals.totalEUR + surplusInEUR * horizon : null
  const projectedPersonalEUR = currentTotals ? currentTotals.personalEUR + surplusInEUR * horizon : null

  const chartData = [
    ...rows.filter(r => +r.amount > 0).map((r, i) => ({ name: r.category, value: +r.amount, type: 'expense', i })),
    ...(monthlySurplus > 0 ? [{ name: 'Savings', value: monthlySurplus, type: 'savings', i: 99 }] : []),
  ]

  const projectionMonths = Array.from({ length: horizon }, (_, i) => ({
    month: `Mo ${i + 1}`,
    saved: monthlySurplus * (i + 1),
    total: currentTotals ? (currency === 'EUR' ? currentTotals.totalEUR : currentTotals.totalEUR * rate) + monthlySurplus * (i + 1) : monthlySurplus * (i + 1),
  }))

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-ldg-ink">Financial Planner</h2>
        <p className="text-sm text-ldg-ink/55 mt-1">What-if playground — nothing is saved</p>
      </div>

      {/* Currency + Income + Horizon */}
      <div className="bg-ldg-card rounded-xl border border-ldg-ink/10 p-4 space-y-4">
        <div>
          <label className="text-xs font-medium text-ldg-ink/55">Plan in</label>
          <div className="flex gap-2 mt-1">
            {(['RSD', 'EUR'] as const).map(c => (
              <button key={c} onClick={() => switchCurrency(c)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${currency === c ? 'bg-ldg-green text-white border-ldg-green' : 'border-ldg-ink/10 text-ldg-ink/70 hover:bg-ldg-ink/[0.04]'}`}>
                {c}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-ldg-ink/55">Expected monthly income ({unit})</label>
          <NumberInput value={income} onChange={setIncome}
            className="mt-1 w-full border border-ldg-ink/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:outline-none" />
          {income && currency === 'EUR' && (
            <p className="text-xs text-ldg-ink/40 mt-1">≈ {Math.round(+income * rate).toLocaleString()} RSD</p>
          )}
          {income && currency === 'RSD' && (
            <p className="text-xs text-ldg-ink/40 mt-1">≈ €{(+income / rate).toFixed(2)}</p>
          )}
        </div>

        <div>
          <label className="text-xs font-medium text-ldg-ink/55">Plan over</label>
          <div className="flex gap-2 mt-1">
            {HORIZON_OPTIONS.map(h => (
              <button key={h} onClick={() => setHorizon(h)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${horizon === h ? 'bg-ldg-green text-white border-ldg-green' : 'border-ldg-ink/10 text-ldg-ink/70 hover:bg-ldg-ink/[0.04]'}`}>
                {h}mo
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2">
        <button onClick={() => switchMode('auto')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-medium transition-colors ${mode === 'auto' ? 'bg-ldg-green text-white border-ldg-green' : 'border-ldg-ink/10 text-ldg-ink/70 hover:bg-ldg-ink/[0.04]'}`}>
          <Sparkles size={15} /> Use my averages
        </button>
        <button onClick={() => switchMode('manual')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-medium transition-colors ${mode === 'manual' ? 'bg-ldg-green text-white border-ldg-green' : 'border-ldg-ink/10 text-ldg-ink/70 hover:bg-ldg-ink/[0.04]'}`}>
          <SlidersHorizontal size={15} /> Set manually
        </button>
      </div>

      {/* Category inputs */}
      {loading ? (
        <div className="text-center text-ldg-ink/40 py-8 animate-pulse">Loading your data…</div>
      ) : (
        <div className="bg-ldg-card rounded-xl border border-ldg-ink/10 divide-y divide-black/5 dark:divide-white/5">
          {rows.map((row, i) => (
            <div key={row.category} className="flex items-center gap-3 px-4 py-3">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
              <span className="flex-1 text-sm text-ldg-ink/70 truncate">{row.category}</span>
              <div className="w-32">
                <NumberInput value={row.amount} onChange={v => updateRow(row.category, v)}
                  className="w-full border border-ldg-ink/10 rounded-lg px-3 py-1.5 text-sm text-right focus:outline-none focus:outline-none" />
              </div>
              <span className="text-xs text-ldg-ink/40 w-8 shrink-0">{unit}</span>
            </div>
          ))}
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-b-xl">
            <span className="text-sm font-semibold text-ldg-ink/70">Total spending</span>
            <span className="text-sm font-bold text-ldg-ink">{sym}{totalSpend.toLocaleString()} {unit}</span>
          </div>
        </div>
      )}

      {/* Result */}
      {incomeNum > 0 && (
        <>
          <Card className="p-5" accent={monthlySurplus >= 0 ? 'green' : 'urgent'}>
            <Label>Monthly {monthlySurplus >= 0 ? 'surplus' : 'deficit'}</Label>
            <p className={cn('font-mono text-[26px] tabular-nums tracking-tight leading-none mt-1', monthlySurplus >= 0 ? 'text-ldg-green' : 'text-ldg-urgent')}>{sym}{Math.abs(monthlySurplus).toLocaleString()} {unit}</p>
            {currency === 'EUR'
              ? <p className="font-mono text-[12px] text-ldg-ink/55 mt-0.5">≈ {Math.abs(Math.round(monthlySurplus * rate)).toLocaleString()} RSD</p>
              : <p className="font-mono text-[12px] text-ldg-ink/55 mt-0.5">≈ €{Math.abs(monthlySurplus / rate).toFixed(2)}</p>
            }
            <div className="mt-3 pt-3 border-t border-ldg-ink/[0.07] flex justify-between">
              <div>
                <p className="text-[11px] text-ldg-ink/55">After {horizon} month{horizon > 1 ? 's' : ''}</p>
                <p className="font-mono text-[17px] font-semibold text-ldg-ink">{sym}{Math.abs(totalSaved).toLocaleString()} {unit} {totalSaved < 0 ? 'short' : 'saved'}</p>
              </div>
              {savingsRate > 0 && (
                <div className="text-right">
                  <p className="text-[11px] text-ldg-ink/55">Savings rate</p>
                  <p className="font-mono text-[17px] font-semibold text-ldg-ink">{savingsRate.toFixed(0)}%</p>
                </div>
              )}
            </div>
          </Card>

          {/* Impact on current totals */}
          {currentTotals && monthlySurplus !== 0 && (
            <div className="bg-ldg-card rounded-xl border border-ldg-ink/10 p-4">
              <h3 className="text-sm font-semibold text-ldg-ink/70 mb-3">
                Impact on your balance after {horizon} month{horizon > 1 ? 's' : ''}
              </h3>
              <div className="space-y-3">
                {[
                  { label: 'Total (all accounts)', now: currentTotals.totalEUR, after: currentTotals.totalEUR + surplusInEUR * horizon },
                  { label: 'Personal accounts', now: currentTotals.personalEUR, after: currentTotals.personalEUR + surplusInEUR * horizon },
                ].map(row => {
                  const diff = row.after - row.now
                  const positive = diff >= 0
                  return (
                    <div key={row.label} className="flex items-center justify-between">
                      <span className="text-sm text-ldg-ink/55">{row.label}</span>
                      <div className="text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <span className="text-xs text-ldg-ink/40">€{row.now.toLocaleString('en', { maximumFractionDigits: 0 })}</span>
                          <span className="text-gray-300 dark:text-gray-600">→</span>
                          <span className={`text-sm font-bold ${positive ? 'text-green-600' : 'text-red-500'}`}>
                            €{row.after.toLocaleString('en', { maximumFractionDigits: 0 })}
                          </span>
                        </div>
                        <p className={`text-xs ${positive ? 'text-green-500' : 'text-red-400'}`}>
                          {positive ? '+' : ''}€{diff.toLocaleString('en', { maximumFractionDigits: 0 })}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Breakdown chart */}
          {chartData.length > 0 && (
            <div className="bg-ldg-card rounded-xl border border-ldg-ink/10 p-4">
              <h3 className="text-sm font-semibold text-ldg-ink/70 mb-3">Monthly breakdown</h3>
              <ResponsiveContainer width="100%" height={Math.max(160, chartData.length * 36)}>
                <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => currency === 'EUR' ? `€${v}` : `${(v/1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
                  <Tooltip formatter={(v: any) => `${sym}${v.toLocaleString()} ${unit}`} />
                  <Bar dataKey="value" radius={4}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={entry.type === 'savings' ? '#2e7d4f' : COLORS[entry.i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Savings + total projection over time */}
          {horizon > 1 && monthlySurplus > 0 && (
            <div className="bg-ldg-card rounded-xl border border-ldg-ink/10 p-4">
              <h3 className="text-sm font-semibold text-ldg-ink/70 mb-1">
                Projected total balance over {horizon} months
              </h3>
              {currentTotals && (
                <p className="text-xs text-ldg-ink/40 mb-3">Starting from €{currentTotals.totalEUR.toLocaleString('en', { maximumFractionDigits: 0 })} today</p>
              )}
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={projectionMonths}>
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => currency === 'EUR' ? `€${(v/1000).toFixed(0)}k` : `${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: any, name: string) => [`${sym}${v.toLocaleString('en', { maximumFractionDigits: 0 })} ${unit}`, name === 'total' ? 'Total balance' : 'Saved this plan']} />
                  {currentTotals && <Bar dataKey="total" fill="#2e7d4f" radius={4} name="total" />}
                  {!currentTotals && <Bar dataKey="saved" fill="#2e7d4f" radius={4} name="saved" />}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  )
}
