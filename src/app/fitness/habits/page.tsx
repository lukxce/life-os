'use client'
import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { HabitCard } from '@/components/habits/HabitCard'
import { ReentryModal } from '@/components/habits/ReentryModal'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'

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

function HabitsTracker() {
  const [habits, setHabits]   = useState<Habit[]>([])
  const [logs, setLogs]       = useState<Record<string, HabitLog>>({})
  const [loading, setLoading] = useState(true)
  const [offset, setOffset]   = useState(0)
  const [reentry, setReentry] = useState<{ habit: Habit; date: string } | null>(null)
  const searchParams          = useSearchParams()

  const dateObj = new Date(); dateObj.setDate(dateObj.getDate() + offset)
  const dateStr = dateObj.toISOString().slice(0, 10)
  const isToday = offset === 0

  const load = useCallback(async () => {
    setLoading(true)
    const [habRes, logRes] = await Promise.all([
      fetch('/api/life/habits'),
      fetch(`/api/life/habit-logs?date=${dateStr}&include_streak=true`),
    ])
    const habData = await habRes.json()
    const logData = await logRes.json()
    setHabits(habData)
    const lm: Record<string, HabitLog> = {}
    for (const l of logData) lm[l.habitId] = l
    setLogs(lm)
    setLoading(false)
  }, [dateStr])

  useEffect(() => { load() }, [load])

  const dow = dateObj.getDay()
  const scheduled = habits.filter(h => {
    if (!h.active || h.category === 'paused') return false
    if (h.frequency === 'daily') return true
    if (h.frequency === 'weekdays') return dow >= 1 && dow <= 5
    if (h.frequency === 'specific') return h.frequencyDays.includes(dow)
    return true
  })

  const completed  = scheduled.filter(h => logs[h.id]?.completed).length
  const pct        = scheduled.length > 0 ? Math.round((completed / scheduled.length) * 100) : 0

  function handleLog(habitId: string, data: Partial<HabitLog>) {
    setLogs(prev => ({ ...prev, [habitId]: { ...prev[habitId], ...data } }))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Habits</h1>
          <p className="text-sm text-gray-400 mt-0.5">Daily habit tracking</p>
        </div>
        <Link href="/life/habits?add=1"
          className="text-xs font-medium text-green-600 dark:text-green-400 hover:underline">
          Manage habits →
        </Link>
      </div>

      {/* Date nav */}
      <div className="flex items-center justify-between bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 px-4 py-3">
        <button onClick={() => setOffset(o => o - 1)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
          <ChevronLeft size={16} />
        </button>
        <div className="text-center">
          <p className="font-semibold text-sm text-gray-900 dark:text-white">
            {isToday ? 'Today' : dateObj.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
          </p>
          {!isToday && <p className="text-xs text-gray-400">{dateObj.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</p>}
        </div>
        <button onClick={() => setOffset(o => Math.min(o + 1, 0))} disabled={isToday}
          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-30">
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Progress */}
      {scheduled.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{completed}/{scheduled.length} done</span>
            <span className={cn('text-sm font-bold', pct === 100 ? 'text-green-600' : 'text-gray-400')}>{pct}%</span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2">
            <div className={cn('h-2 rounded-full transition-all', pct === 100 ? 'bg-green-500' : 'bg-indigo-500')} style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {/* Habit list */}
      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse" />)}</div>
      ) : scheduled.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-400 text-sm">No habits scheduled for this day.</p>
          <Link href="/life/habits?add=1" className="text-green-600 dark:text-green-400 text-sm font-medium mt-2 inline-block hover:underline">
            Add a habit
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {scheduled.map(habit => (
            <HabitCard key={habit.id} habit={habit} log={logs[habit.id] ?? null} date={dateStr}
              onLog={(data) => handleLog(habit.id, data)}
              onReentry={() => setReentry({ habit, date: dateStr })} />
          ))}
        </div>
      )}

      {reentry && (
        <ReentryModal habit={reentry.habit} date={reentry.date}
          onClose={() => setReentry(null)} onSaved={load} />
      )}
    </div>
  )
}

export default function FitnessHabitsPage() {
  return (
    <Suspense>
      <HabitsTracker />
    </Suspense>
  )
}
