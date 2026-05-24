'use client'
import { useEffect, useState, useCallback } from 'react'
import { HabitCard } from '@/components/habits/HabitCard'
import { calcStreak, startOfDay } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface SubTask { id: string; name: string; order: number }
interface Habit {
  id: string; name: string; category: string; type: string
  icon?: string | null; color?: string | null; unit?: string | null; target?: number | null
  frequency: string; frequencyDays: number[]; timeOfDay: string; createdAt: string
  subTasks: SubTask[]
}
interface HabitLog {
  id?: string; completed: boolean; value?: number | null; date?: string
  completedSubTaskIds?: string[]
}
interface TodayItem { habit: Habit; log: HabitLog | null; isScheduled: boolean }
interface WeekScore { score: number; completed: number; total: number }
interface ScoreData { thisWeek: WeekScore; lastWeek: WeekScore; delta: number; direction: 'up' | 'down' | 'same' }

function thisSunday(): Date {
  const d = startOfDay(new Date())
  const day = d.getDay()
  const daysUntilSunday = day === 0 ? 0 : 7 - day
  d.setDate(d.getDate() + daysUntilSunday)
  return d
}

function mondayOf(date: Date): Date {
  const d = startOfDay(new Date(date))
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  return d
}

function formatDateRange(monday: Date): string {
  const sunday = new Date(monday)
  sunday.setDate(sunday.getDate() + 6)
  const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  return `${fmt(monday)} – ${fmt(sunday)}`
}

export default function WeeklyPage() {
  const [items, setItems] = useState<TodayItem[]>([])
  const [scoreData, setScoreData] = useState<ScoreData | null>(null)
  const [loading, setLoading] = useState(true)
  const [sunday] = useState<Date>(thisSunday)

  const load = useCallback(async () => {
    setLoading(true)
    const [itemsRes, scoreRes] = await Promise.all([
      fetch(`/api/life/today?date=${sunday.toISOString().split('T')[0]}`),
      fetch('/api/life/weekly-score'),
    ])
    const allItems: TodayItem[] = await itemsRes.json()
    setItems(allItems.filter(i => i.habit.category === 'Weekly Check-in'))
    setScoreData(await scoreRes.json())
    setLoading(false)
  }, [sunday])

  useEffect(() => { load() }, [load])

  async function handleToggle(item: TodayItem, completed: boolean) {
    setItems(prev => prev.map(i => i.habit.id === item.habit.id ? { ...i, log: { ...(i.log ?? {}), completed } } : i))
    await fetch('/api/life/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ habitId: item.habit.id, date: sunday.toISOString(), completed, value: item.log?.value ?? null }),
    })
  }

  async function handleQuantity(item: TodayItem, value: number) {
    const completed = item.habit.target != null ? value >= item.habit.target : false
    setItems(prev => prev.map(i => i.habit.id === item.habit.id ? { ...i, log: { ...(i.log ?? {}), value, completed } } : i))
    await fetch('/api/life/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ habitId: item.habit.id, date: sunday.toISOString(), completed, value }),
    })
  }

  const monday = mondayOf(sunday)
  const weekRange = formatDateRange(monday)

  const DirIcon = scoreData?.direction === 'up' ? TrendingUp : scoreData?.direction === 'down' ? TrendingDown : Minus
  const dirColor = scoreData?.direction === 'up' ? 'text-green-500' : scoreData?.direction === 'down' ? 'text-red-500' : 'text-gray-400'

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-32 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse" />
        {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse" />)}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Weekly</h1>
        <p className="text-sm text-gray-400 mt-0.5">{weekRange}</p>
      </div>

      {/* Weekly score card */}
      {scoreData && (
        <div className="bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl p-5 text-white">
          <p className="text-xs font-semibold tracking-widest uppercase text-white/60 mb-1">Weekly Score</p>
          <div className="flex items-end gap-3">
            <span className="text-5xl font-bold">{scoreData.thisWeek.score}%</span>
            {scoreData.lastWeek.total > 0 && (
              <div className="flex items-center gap-1 pb-1 text-white/80">
                <DirIcon size={18} />
                <span className="text-sm font-semibold">
                  {scoreData.delta > 0 ? '+' : ''}{scoreData.delta}% vs last week
                </span>
              </div>
            )}
          </div>
          <div className="mt-3 w-full h-2 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all duration-700" style={{ width: `${scoreData.thisWeek.score}%` }} />
          </div>
          {scoreData.thisWeek.total > 0
            ? <p className="text-xs text-white/60 mt-2">{scoreData.thisWeek.completed} of {scoreData.thisWeek.total} habit days logged this week</p>
            : <p className="text-xs text-white/60 mt-2">Start logging habits on the Today tab to build your score</p>
          }
        </div>
      )}

      {/* Check-ins */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1">
          Sunday check-ins
        </h2>
        <p className="text-xs text-gray-400 mb-3">Tick these once a week — logged against this Sunday</p>
        {items.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 text-center text-gray-400">
            <div className="text-3xl mb-2">📋</div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Check-ins not set up yet</p>
            <p className="text-xs mt-1 text-gray-400">These are seeded automatically on first deploy.<br/>Merge the PR to activate them.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800 overflow-hidden">
            {items.map(item => {
              const habitWithLogs = {
                ...item.habit,
                createdAt: new Date(item.habit.createdAt),
                logs: item.log ? [{ date: item.log.date ?? sunday.toISOString(), completed: item.log.completed }] : [],
              }
              return (
                <HabitCard
                  key={item.habit.id}
                  habit={item.habit}
                  log={item.log}
                  streak={calcStreak(habitWithLogs)}
                  onToggle={completed => handleToggle(item, completed)}
                  onQuantityUpdate={value => handleQuantity(item, value)}
                />
              )
            })}
          </div>
        )}
      </section>

      {/* Last week score */}
      {scoreData && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Last week</p>
            <p className="text-2xl font-bold text-gray-700 dark:text-gray-300 mt-0.5">{scoreData.lastWeek.score}%</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">{scoreData.lastWeek.completed} / {scoreData.lastWeek.total} habits</p>
          </div>
        </div>
      )}
    </div>
  )
}
