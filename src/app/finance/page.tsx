'use client'
import { useEffect, useState } from 'react'
import { formatRSD, formatEUR, Period, formatDate } from '@/lib/utils'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts'
import Link from 'next/link'

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
  const [bundled, setBundled] = useState(true)
  const [loading, setLoading] = useState(true)
  const [recent, setRecent] = useState<any[]>([])
  const [budgets, setBudgets] = useState<any[]>([])
  const [goals, setGoals] = useState<any[]>([])
  const [monthSpent, setMonthSpent] = useState<Record<string, { rsd: number; eur: number }>>({})

  const fetchData = async () => {
    setLoading(true)
    const res = await fetch(`/api/finance/dashboard?period=${period}&date=${date}`)
    const json = await res.json()
    setData(json)
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [period, date])
  useEffect(() => { fetch('/api/finance/recent?limit=5').then(r => r.json()).then(setRecent).catch(() => {}) }, [])
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

  if (loading || !data) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-gray-500 dark:text-gray-400 animate-pulse">Loading...</div>
    </div>
  )

  const personalAccounts = data.accounts.filter(a => a.type === 'personal')
  const companyAccounts = data.accounts.filter(a => a.type === 'company')

  return (
    <div className="space-y-4 md:space-y-6 max-w-7xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Your financial overview</p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-black/10 dark:border-white/10 p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
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
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${active ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:bg-gray-800'}`}>
                {s.label}
              </button>
            )
          })}
        </div>
        {/* Desktop-only: manual period + date picker */}
        <div className="hidden md:flex items-end gap-3">
          <div className="flex-1">
            <label className="text-xs text-gray-500 dark:text-gray-400 font-medium">Period</label>
            <select value={period} onChange={e => setPeriod(e.target.value as Period)}
              className="block mt-1 w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 h-[38px] bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="day">Day</option>
              <option value="week">Week</option>
              <option value="month">Month</option>
              <option value="year">Year</option>
              <option value="all">All Time</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="text-xs text-gray-500 dark:text-gray-400 font-medium">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="block mt-1 w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 h-[38px] bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <button onClick={fetchData}
            className="h-[38px] bg-blue-600 text-white px-4 rounded-lg text-sm font-medium hover:bg-blue-700 shrink-0">
            Refresh
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      {recent.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-black/10 dark:border-white/10 p-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Recent Activity</h3>
          <div className="space-y-2">
            {recent.map(r => (
              <Link key={`${r.type}-${r.id}`} href={r.href} className="flex items-center justify-between py-1.5 hover:bg-gray-50 dark:bg-gray-800 rounded px-1 -mx-1 transition-colors">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${r.type === 'expense' ? 'bg-red-400' : r.type === 'income' ? 'bg-green-400' : 'bg-gray-300'}`} />
                  <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{r.label || r.sub}</span>
                  <span className="text-xs text-gray-400 shrink-0">{formatDate(r.date)}</span>
                </div>
                <span className={`text-sm font-medium shrink-0 ml-2 ${r.type === 'expense' ? 'text-red-600' : r.type === 'income' ? 'text-green-600' : 'text-gray-500 dark:text-gray-400'}`}>
                  {r.type === 'expense' ? '−' : r.type === 'income' ? '+' : ''}{r.amount.toLocaleString()}{r.currency ? ` ${r.currency}` : ''}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Budgets */}
      {budgets.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-black/10 dark:border-white/10 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Budgets — This Month</h3>
            <Link href="/finance/budgets" className="text-xs text-blue-600 hover:underline">Manage</Link>
          </div>
          <div className="space-y-3">
            {budgets.map(b => {
              const s = monthSpent[b.category] ?? { rsd: 0, eur: 0 }
              return (
                <div key={b.id}>
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">{b.category}</p>
                  {b.amountRSD && (() => {
                    const pct = Math.min(100, (s.rsd / b.amountRSD) * 100)
                    const color = pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-orange-400' : 'bg-green-500'
                    return (
                      <div>
                        <div className="flex justify-between text-xs text-gray-400 mb-0.5">
                          <span>{s.rsd.toLocaleString()} / {b.amountRSD.toLocaleString()} RSD</span>
                          <span className={pct >= 100 ? 'text-red-500 font-semibold' : pct >= 80 ? 'text-orange-500 font-semibold' : ''}>{pct.toFixed(0)}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })()}
                  {b.amountEUR && (() => {
                    const pct = Math.min(100, (s.eur / b.amountEUR) * 100)
                    const color = pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-orange-400' : 'bg-green-500'
                    return (
                      <div className="mt-1">
                        <div className="flex justify-between text-xs text-gray-400 mb-0.5">
                          <span>€{s.eur.toLocaleString()} / €{b.amountEUR.toLocaleString()}</span>
                          <span className={pct >= 100 ? 'text-red-500 font-semibold' : pct >= 80 ? 'text-orange-500 font-semibold' : ''}>{pct.toFixed(0)}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Saving Goals */}
      {goals.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-black/10 dark:border-white/10 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Saving Goals</h3>
            <Link href="/finance/goals" className="text-xs text-blue-600 hover:underline">Manage</Link>
          </div>
          <div className="space-y-3">
            {goals.map((g: any) => {
              const pct = Math.min(100, g.pct ?? 0)
              const barColor = pct >= 100 ? 'bg-green-500' : pct >= 60 ? 'bg-blue-500' : 'bg-blue-300'
              return (
                <div key={g.id}>
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="font-medium text-gray-600 dark:text-gray-300">{g.name}</span>
                    <span className="text-gray-400">{g.currency === 'EUR' ? '€' : ''}{g.saved.toLocaleString('en', { maximumFractionDigits: 0 })} / {g.currency === 'EUR' ? '€' : ''}{g.targetAmount.toLocaleString()} {g.currency}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Total All Accounts */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-5 md:p-6 text-white">
        <p className="text-blue-100 text-sm font-medium">Total All Accounts (Live EUR)</p>
        <p className="text-3xl md:text-4xl font-bold mt-1">{formatEUR(data.totals.totalEUR)}</p>
        <p className="text-blue-200 text-sm mt-1">{formatRSD(data.totals.totalRSD)}</p>
        <div className="flex gap-6 mt-4">
          <div>
            <p className="text-blue-200 text-xs">Personal</p>
            <p className="text-white font-semibold">{formatEUR(data.totals.personalEUR)}</p>
          </div>
          <div>
            <p className="text-blue-200 text-xs">Company</p>
            <p className="text-white font-semibold">{formatEUR(data.totals.companyEUR)}</p>
          </div>
        </div>
      </div>

      {/* Account Balances */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Account Balances</h3>
          <button onClick={() => setBundled(!bundled)} className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            {bundled ? 'Show Individual' : 'Show Bundled'}
          </button>
        </div>
        {bundled ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-black/10 dark:border-white/10 p-4 md:p-5">
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Personal Total</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{formatRSD(data.totals.personalRSD)}</p>
              <p className="text-sm text-gray-400">{formatEUR(data.totals.personalEUR)}</p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-black/10 dark:border-white/10 p-4 md:p-5">
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Company Total</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">{formatRSD(data.totals.companyRSD)}</p>
              <p className="text-sm text-gray-400">{formatEUR(data.totals.companyEUR)}</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[...personalAccounts, ...companyAccounts].map(acc => (
              <div key={acc.id} className="bg-white dark:bg-gray-900 rounded-xl border border-black/10 dark:border-white/10 p-4">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${acc.type === 'personal' ? 'bg-blue-500' : 'bg-purple-500'}`} />
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{acc.name}</p>
                </div>
                <p className="text-xl font-bold mt-2 text-gray-900 dark:text-gray-100">
                  {acc.currency === 'EUR' ? formatEUR(acc.currentBalance) : formatRSD(acc.currentBalance)}
                </p>
                <p className="text-xs text-gray-400">
                  {acc.currency === 'EUR' ? formatRSD(acc.balanceRSD) : formatEUR(acc.balanceEUR)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Expenses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {[
          { title: 'Personal Expenses', data: data.personalExpenses, color: 'red' },
          { title: 'Business Expenses', data: data.businessExpenses, color: 'purple' },
        ].map(section => (
          <div key={section.title} className="bg-white dark:bg-gray-900 rounded-xl border border-black/10 dark:border-white/10 p-4 md:p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{section.title}</h3>
            {section.data.filter(e => e.amountRSD > 0).length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No expenses this period</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={section.data.filter(e => e.amountRSD > 0)} dataKey="amountRSD" nameKey="category" cx="50%" cy="50%" outerRadius={70}>
                      {section.data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: any) => formatRSD(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-2">
                  {section.data.map((e, i) => (
                    <div key={e.category} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                        <span className="text-gray-600 dark:text-gray-300 truncate">{e.category}</span>
                      </div>
                      <span className="font-medium text-gray-900 dark:text-gray-100 shrink-0 ml-2">{formatRSD(e.amountRSD)}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between text-sm font-bold pt-2 border-t border-gray-100 dark:border-gray-700">
                    <span>Total</span>
                    <span className={section.color === 'red' ? 'text-red-600' : 'text-purple-600'}>
                      {formatRSD(section.data.reduce((s, e) => s + e.amountRSD, 0))}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Income */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-black/10 dark:border-white/10 p-4 md:p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Income</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
          {[
            { label: 'Salary', rsd: data.income.salaryRSD },
            { label: 'Invoice (RSD)', rsd: data.income.invoiceRSD },
            { label: 'Invoice (EUR)', rsd: data.income.invoiceEURinRSD },
            { label: 'Other (RSD)', rsd: data.income.otherRSD },
            { label: 'Other (EUR)', rsd: data.income.otherEURinRSD },
            { label: 'Total Gross', rsd: data.income.totalGrossRSD, bold: true },
          ].map(row => (
            <div key={row.label} className={`${row.bold ? 'bg-green-50 border border-green-200' : 'bg-gray-50 dark:bg-gray-800'} rounded-lg p-3`}>
              <p className="text-xs text-gray-500 dark:text-gray-400">{row.label}</p>
              <p className={`text-sm font-semibold mt-1 ${row.bold ? 'text-green-700' : 'text-gray-900 dark:text-gray-100'}`}>{formatRSD(row.rsd)}</p>
              <p className="text-xs text-gray-400">{formatEUR(row.rsd / data.liveRate)}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
          <div className="flex-1 bg-green-50 rounded-lg p-4 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">Total Net (RSD)</p>
            <p className="text-xl font-bold text-green-600">{formatRSD(data.income.totalNetRSD)}</p>
            <p className="text-xs text-gray-400">{formatEUR(data.income.totalNetEUR)}</p>
          </div>
          <div className="flex-1 bg-red-50 rounded-lg p-4 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">Total Deductions</p>
            <p className="text-xl font-bold text-red-500">{formatRSD(data.income.totalDeductions)}</p>
          </div>
        </div>
      </div>
    </div>
  )
}