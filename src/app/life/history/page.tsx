'use client'
import { useEffect, useState, useCallback } from 'react'
import { HeatmapGrid } from '@/components/habits/HeatmapGrid'
import { startOfDay } from '@/lib/utils'

interface Habit {
  id: string
  name: string
  icon?: string | null
  color?: string | null
  frequency: string
  frequencyDays: number[]
  createdAt: string
}

interface Log {
  id: string
  habitId: string
  date: string
  completed: boolean
  value?: number | null
}

type Period = 7 | 30 | 90

export default function HistoryPage() {
  const [habits, setHabits] = useState<Habit[]>([])
  const [logs, setLogs] = useState<Log[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<Period>(30)
  const [filterHabit, setFilterHabit] = useState<string>('all')

  const load = useCallback(async () => {
    setLoading(true)
    const to = new Date()
    const from = new Date(to)
    from.setFullYear(from.getFullYear() - 1)

    const [habitsRes, logsRes] = await Promise.all([
      fetch('/api/life/habits'),
      fetch(`/api/life/logs?from=${from.toISOString().split('T')[0]}&to=${to.toISOString().split('T')[0]}`),
    ])
    setHabits(await habitsRes.json())
    setLogs(await logsRes.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Build heatmap data
  const heatmapData = new Map<string, { date: string; completionRate: number; completed: number; total: number }>()
  const logsByDate = new Map<string, Log[]>()
  for (const log of logs) {
    const d = log.date.split('T')[0]
    if (!logsByDate.has(d)) logsByDate.set(d, [])
    logsByDate.get(d)!.push(log)
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yearAgo = new Date(today)
  yearAgo.setFullYear(yearAgo.getFullYear() - 1)
  const cursor = new Date(yearAgo)

  while (cursor <= today) {
    const dateStr = cursor.toISOString().split('T')[0]
    const dayLogs = logsByDate.get(dateStr) ?? []
    const dayCompleted = dayLogs.filter((l) => l.completed).length
    const dayTotal = dayLogs.length
    heatmapData.set(dateStr, {
      date: dateStr,
      completionRate: dayTotal > 0 ? Math.round((dayCompleted / dayTotal) * 100) : 0,
      completed: dayCompleted,
      total: dayTotal,
    })
    cursor.setDate(cursor.getDate() + 1)
  }

  // Timeline
  const timelineFrom = new Date()
  timelineFrom.setDate(timelineFrom.getDate() - period + 1)
  timelineFrom.setHours(0, 0, 0, 0)

  const visibleHabits = filterHabit === 'all' ? habits : habits.filter((h) => h.id === filterHabit)

  const days: Date[] = []
  const tc = new Date(timelineFrom)
  while (tc <= today) {
    days.push(new Date(tc))
    tc.setDate(tc.getDate() + 1)
  }

  function getDayStatus(habit: Habit, day: Date): 'done' | 'missed' | 'unscheduled' {
    const isScheduled = (() => {
      switch (habit.frequency) {
        case 'daily': return true
        case 'every_other_day': {
          const created = startOfDay(new Date(habit.createdAt))
          const diff = Math.round((day.getTime() - created.getTime()) / 86400000)
          return diff % 2 === 0
        }
        case 'every_n_days': {
          const n = habit.frequencyDays[0] ?? 1
          const created = startOfDay(new Date(habit.createdAt))
          const diff = Math.round((day.getTime() - created.getTime()) / 86400000)
          return diff % n === 0
        }
        case 'specific_days': return habit.frequencyDays.includes(day.getDay())
        default: return true
      }
    })()

    if (!isScheduled) return 'unscheduled'
    const dateStr = day.toISOString().split('T')[0]
    const log = logs.find((l) => l.habitId === habit.id && l.date.startsWith(dateStr))
    if (!log) return day < today ? 'missed' : 'unscheduled'
    return log.completed ? 'done' : 'missed'
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
        <div className="h-32 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
        <div className="h-48 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">History</h1>

      <section>
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
          Year overview
        </h2>
        <div className="bg-surface/90 dark:bg-surface/70 border border-black/5 dark:border-white/5 rounded-2xl p-4 overflow-x-auto">
          <HeatmapGrid data={heatmapData} />
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Per-habit timeline
          </h2>
          <div className="flex gap-2 flex-wrap">
            <select
              className="text-sm border border-gray-300 dark:border-gray-700 rounded-lg px-2 py-1.5 bg-surface/90 dark:bg-surface/70"
              value={filterHabit}
              onChange={(e) => setFilterHabit(e.target.value)}
            >
              <option value="all">All habits</option>
              {habits.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.icon} {h.name}
                </option>
              ))}
            </select>
            {([7, 30, 90] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                  period === p
                    ? 'bg-ldg-green text-white border-ldg-green'
                    : 'border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                {p}d
              </button>
            ))}
          </div>
        </div>

        {visibleHabits.length === 0 ? (
          <div className="text-center py-8 text-gray-400">No habits found</div>
        ) : (
          <div className="bg-surface/90 dark:bg-surface/70 border border-black/5 dark:border-white/5 rounded-2xl p-4 overflow-x-auto">
            <div className="space-y-3" style={{ minWidth: `${Math.max(400, days.length * 16 + 160)}px` }}>
              {visibleHabits.map((habit) => (
                <div key={habit.id} className="flex items-center gap-2">
                  <div className="w-36 shrink-0 flex items-center gap-1.5">
                    <span className="text-base">{habit.icon ?? '📋'}</span>
                    <span className="text-xs font-medium truncate">{habit.name}</span>
                  </div>
                  <div className="flex gap-0.5">
                    {days.map((day) => {
                      const status = getDayStatus(habit, day)
                      return (
                        <div
                          key={day.toISOString()}
                          title={`${day.toLocaleDateString('en-GB')}: ${status}`}
                          className={`w-3.5 h-3.5 rounded-full ${
                            status === 'done'
                              ? 'bg-green-500'
                              : status === 'missed'
                              ? 'bg-red-400'
                              : 'bg-gray-200 dark:bg-gray-700'
                          }`}
                        />
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> Done</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-400 inline-block" /> Missed</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-gray-200 dark:bg-gray-700 inline-block" /> Not scheduled</span>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
