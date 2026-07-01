'use client'
import { useEffect, useState, useCallback } from 'react'
import { HabitCard } from '@/components/habits/HabitCard'
import { calcStreak, startOfDay } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'

interface SubTask { id: string; name: string; order: number }
interface Habit {
  id: string; name: string; category: string; type: string
  icon?: string | null; color?: string | null; unit?: string | null; target?: number | null
  frequency: string; frequencyDays: number[]; timeOfDay: string; createdAt: string
  active: boolean; paused: boolean
  subTasks: SubTask[]
}
interface HabitLog {
  id?: string; completed: boolean; value?: number | null; date?: string
  completedSubTaskIds?: string[]
}
interface TodayItem { habit: Habit; log: HabitLog | null; isScheduled: boolean }

function toLocalDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function FitnessHabitsPage() {
  const [items,   setItems]   = useState<TodayItem[]>([])
  const [loading, setLoading] = useState(true)
  const [offset,  setOffset]  = useState(0)

  const dateObj = new Date(); dateObj.setDate(dateObj.getDate() + offset)
  const dateStr = toLocalDateStr(dateObj)
  const isToday = offset === 0

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/life/today?date=${dateStr}`)
    setItems(await res.json())
    setLoading(false)
  }, [dateStr])

  useEffect(() => { load() }, [load])

  const scheduled = items.filter(i => i.isScheduled && i.habit.category !== 'Weekly Check-in')
  const completed  = scheduled.filter(i => i.log?.completed).length
  const pct        = scheduled.length > 0 ? Math.round((completed / scheduled.length) * 100) : 0

  async function handleToggle(item: TodayItem, done: boolean) {
    setItems(prev => prev.map(i => i.habit.id === item.habit.id ? { ...i, log: { ...(i.log ?? {}), completed: done } } : i))
    await fetch('/api/life/logs', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ habitId: item.habit.id, date: dateObj.toISOString(), completed: done, value: item.log?.value ?? null }),
    })
  }

  async function handleQuantity(item: TodayItem, value: number) {
    const done = item.habit.target != null && value >= item.habit.target
    setItems(prev => prev.map(i => i.habit.id === item.habit.id ? { ...i, log: { ...(i.log ?? {}), value, completed: done } } : i))
    await fetch('/api/life/logs', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ habitId: item.habit.id, date: dateObj.toISOString(), completed: done, value }),
    })
  }

  async function handleSubTask(item: TodayItem, subTaskId: string, checked: boolean) {
    const prev = item.log?.completedSubTaskIds ?? []
    const ids  = checked ? [...prev.filter(id => id !== subTaskId), subTaskId] : prev.filter(id => id !== subTaskId)
    const done = item.habit.subTasks.length > 0 && ids.length >= item.habit.subTasks.length
    setItems(prev => prev.map(i => i.habit.id === item.habit.id ? { ...i, log: { ...(i.log ?? {}), completed: done, completedSubTaskIds: ids } } : i))
    await fetch('/api/life/logs', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ habitId: item.habit.id, date: dateObj.toISOString(), completed: done, value: item.log?.value ?? null, completedSubTaskIds: ids }),
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Habits</h1>
          <p className="text-sm text-gray-400 mt-0.5">Daily habit tracking</p>
        </div>
        <Link href="/life/habits"
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
          {!isToday && (
            <p className="text-xs text-gray-400">
              {dateObj.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          )}
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
            <div className={cn('h-2 rounded-full transition-all', pct === 100 ? 'bg-green-500' : 'bg-indigo-500')}
              style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {/* Habit list */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-16 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse" />)}
        </div>
      ) : scheduled.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-400 text-sm">No habits scheduled for this day.</p>
          <Link href="/life/habits" className="text-green-600 dark:text-green-400 text-sm font-medium mt-2 inline-block hover:underline">
            Add a habit →
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {scheduled.map(item => {
            const habitWithLogs = {
              ...item.habit, createdAt: new Date(item.habit.createdAt),
              logs: item.log ? [{ date: item.log.date ?? dateObj.toISOString(), completed: item.log.completed }] : [],
            }
            return (
              <HabitCard key={item.habit.id}
                habit={item.habit}
                log={item.log}
                streak={calcStreak(habitWithLogs)}
                onToggle={done => handleToggle(item, done)}
                onQuantityUpdate={val => handleQuantity(item, val)}
                onSubTask={(id, checked) => handleSubTask(item, id, checked)} />
            )
          })}
        </div>
      )}
    </div>
  )
}
