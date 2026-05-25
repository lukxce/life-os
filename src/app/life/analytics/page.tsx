'use client'
import { useEffect, useState, useCallback } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { TrendingUp, Flame, Trophy, Star } from 'lucide-react'

interface HabitStat {
  habitId: string; name: string; icon?: string | null; color?: string | null
  currentStreak: number; longestStreak: number; completionRate: number
  completedDays: number; scheduledDays: number
}
interface TrendPoint { date: string; completionRate: number }
interface DayOfWeek { day: string; avgCompletionRate: number }
interface AnalyticsData { habitStats: HabitStat[]; trend: TrendPoint[]; bestDayOfWeek: DayOfWeek[] }

type Period = 7 | 30 | 90 | 0

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [period, setPeriod] = useState<Period>(30)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/life/analytics?period=${period}`)
    setData(await res.json())
    setLoading(false)
  }, [period])

  useEffect(() => { load() }, [load])

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
        {[1,2,3].map(i => <div key={i} className="h-36 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse" />)}
      </div>
    )
  }

  const sorted = [...data.habitStats].sort((a, b) => b.currentStreak - a.currentStreak)
  const sortedByRate = [...data.habitStats].sort((a, b) => b.completionRate - a.completionRate)
  const totalCompletions = data.habitStats.reduce((s, h) => s + h.completedDays, 0)
  const avgRate = data.habitStats.length > 0
    ? Math.round(data.habitStats.reduce((s, h) => s + h.completionRate, 0) / data.habitStats.length)
    : 0
  const bestStreak = [...data.habitStats].sort((a, b) => b.longestStreak - a.longestStreak)[0]
  const bestDay = data.bestDayOfWeek.reduce(
    (a, b) => a.avgCompletionRate > b.avgCompletionRate ? a : b,
    data.bestDayOfWeek[0]
  )
  const periodLabel = period === 0 ? 'all time' : `last ${period} days`

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <div className="flex gap-1">
          {([7, 30, 90, 0] as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${period === p ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
              {p === 0 ? 'All' : `${p}d`}
            </button>
          ))}
        </div>
      </div>

      {data.habitStats.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-3">📊</div>
          <p className="font-medium text-gray-600 dark:text-gray-300">No data yet</p>
          <p className="text-sm mt-1">Start tracking habits to see analytics</p>
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
              <div className="flex items-center gap-2 mb-1">
                <Star size={14} className="text-indigo-500" />
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Completions</p>
              </div>
              <p className="text-2xl font-bold text-indigo-600">{totalCompletions}</p>
              <p className="text-xs text-gray-400 mt-0.5">{periodLabel}</p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp size={14} className="text-blue-500" />
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Avg rate</p>
              </div>
              <p className="text-2xl font-bold text-blue-600">{avgRate}%</p>
              <p className="text-xs text-gray-400 mt-0.5">across all habits</p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
              <div className="flex items-center gap-2 mb-1">
                <Flame size={14} className="text-orange-500" />
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Best streak</p>
              </div>
              <p className="text-2xl font-bold text-orange-500">{bestStreak?.longestStreak ?? 0}d</p>
              <p className="text-xs text-gray-400 mt-0.5 truncate">{bestStreak?.name ?? '—'}</p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
              <div className="flex items-center gap-2 mb-1">
                <Trophy size={14} className="text-emerald-500" />
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Best day</p>
              </div>
              <p className="text-2xl font-bold text-emerald-600">{bestDay?.day.slice(0,3) ?? '—'}</p>
              <p className="text-xs text-gray-400 mt-0.5">{bestDay?.avgCompletionRate ?? 0}% avg</p>
            </div>
          </div>

          {/* Per-habit completion rates */}
          <section>
            <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Completion rate</h2>
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl divide-y divide-gray-100 dark:divide-gray-800">
              {sortedByRate.map(h => (
                <div key={h.habitId} className="flex items-center gap-3 px-4 py-3">
                  <span className="text-xl shrink-0">{h.icon ?? '📋'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium truncate">{h.name}</span>
                      <span className="text-sm font-bold ml-2 shrink-0" style={{ color: h.color ?? '#6366f1' }}>{h.completionRate}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${h.completionRate}%`, background: h.color ?? '#6366f1' }} />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{h.completedDays} of {h.scheduledDays} days</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Current streaks */}
          <section>
            <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">🔥 Current streaks</h2>
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl divide-y divide-gray-100 dark:divide-gray-800">
              {sorted.filter(h => h.currentStreak > 0).length === 0 ? (
                <p className="text-sm text-gray-400 px-4 py-4">No active streaks yet</p>
              ) : sorted.filter(h => h.currentStreak > 0).map((h, i) => (
                <div key={h.habitId} className="flex items-center gap-3 px-4 py-3">
                  <span className="text-gray-300 dark:text-gray-600 text-xs w-5 text-center font-semibold">#{i+1}</span>
                  <span className="text-lg shrink-0">{h.icon ?? '📋'}</span>
                  <span className="flex-1 text-sm font-medium truncate">{h.name}</span>
                  <span className="text-sm font-bold text-orange-500 shrink-0">🔥 {h.currentStreak}d</span>
                </div>
              ))}
            </div>
          </section>

          {/* Monthly heatmap */}
          {data.trend.length > 0 && (() => {
            const months = new Map<string, TrendPoint[]>()
            for (const t of data.trend) {
              const key = t.date.slice(0, 7)
              if (!months.has(key)) months.set(key, [])
              months.get(key)!.push(t)
            }
            function dotColor(rate: number, dark: boolean) {
              if (rate === 0) return dark ? '#374151' : '#e5e7eb'
              if (rate < 33)  return dark ? '#14532d' : '#bbf7d0'
              if (rate < 66)  return dark ? '#16a34a' : '#4ade80'
              if (rate < 100) return dark ? '#22c55e' : '#16a34a'
              return '#15803d'
            }
            const isDark = typeof window !== 'undefined' && document.documentElement.classList.contains('dark')
            return (
              <section>
                <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Monthly view</h2>
                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 space-y-4">
                  {Array.from(months.entries()).reverse().map(([month, days]) => {
                    const [y, m] = month.split('-').map(Number)
                    const label = new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
                    const avg = Math.round(days.reduce((s, d) => s + d.completionRate, 0) / days.length)
                    return (
                      <div key={month}>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">{label}</p>
                          <p className="text-xs text-gray-400">{avg}% avg</p>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {days.map(d => (
                            <div key={d.date} title={`${d.date}: ${d.completionRate}%`}
                              className="w-5 h-5 rounded-md"
                              style={{ background: dotColor(d.completionRate, isDark) }} />
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )
          })()}

          {/* Daily trend */}
          {data.trend.length > 1 && (
            <section>
              <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Daily trend</h2>
              <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4">
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={data.trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }}
                      tickFormatter={v => { const d = new Date(v + 'T00:00:00'); return `${d.getDate()}/${d.getMonth()+1}` }}
                      interval={Math.floor(data.trend.length / 5)} />
                    <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 10 }} width={32} />
                    <Tooltip
                      labelFormatter={v => new Date(v + 'T00:00:00').toLocaleDateString('en-GB')}
                      formatter={(v: number) => [`${v}%`, 'Completion']} />
                    <Line type="monotone" dataKey="completionRate" stroke="#6366f1" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
