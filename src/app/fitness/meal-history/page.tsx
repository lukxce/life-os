'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { ChevronLeft, Check, X } from 'lucide-react'

interface MealSlot { id: string; dayOfWeek: number; mealType: string; name: string; calories: number; protein: number }
interface MealLogRow { id: string; date: string; mealType: string; description: string | null }

const MEAL_ORDER = ['breakfast', 'snack', 'dinner']
const MEAL_META: Record<string, { emoji: string; label: string }> = {
  breakfast: { emoji: '🍳', label: 'Breakfast' },
  snack:     { emoji: '🥤', label: 'Snack' },
  dinner:    { emoji: '🍽️', label: 'Dinner' },
}
const DAYS_BACK = 14

function toLocalDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function MealHistoryPage() {
  const [meals, setMeals] = useState<MealSlot[]>([])
  const [logs, setLogs] = useState<MealLogRow[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const today = new Date()
    const from = new Date(today)
    from.setDate(from.getDate() - (DAYS_BACK - 1))
    const [mRes, lRes] = await Promise.all([
      fetch('/api/fitness/meal-plan'),
      fetch(`/api/life/meal-log?from=${toLocalDate(from)}&to=${toLocalDate(today)}`),
    ])
    setMeals(await mRes.json())
    setLogs(await lRes.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => <div key={i} className="h-32 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse" />)}
    </div>
  )

  const days: { date: string; dow: number }[] = []
  const cursor = new Date()
  for (let i = 0; i < DAYS_BACK; i++) {
    days.push({ date: toLocalDate(cursor), dow: cursor.getDay() || 7 })
    cursor.setDate(cursor.getDate() - 1)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/fitness" className="p-1.5 -ml-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg">
          <ChevronLeft size={18} />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">Meal History</h1>
          <p className="text-xs text-gray-400">Planned vs. what you actually logged — last {DAYS_BACK} days</p>
        </div>
      </div>

      <div className="space-y-3">
        {days.map(({ date, dow }) => {
          const dayMeals = meals.filter(m => m.dayOfWeek === dow)
          const dayLogs = logs.filter(l => l.date.slice(0, 10) === date)
          const hasAnyPlan = dayMeals.length > 0
          const hasAnyLog = dayLogs.length > 0
          if (!hasAnyPlan && !hasAnyLog) return null

          const isToday = date === toLocalDate(new Date())
          const label = new Date(date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })

          return (
            <div key={date} className="bg-surface/90 dark:bg-surface/70 rounded-2xl border border-black/5 dark:border-white/5 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-black/5 dark:border-white/5 flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{label}</span>
                {isToday && <span className="text-[10px] font-bold text-[rgb(220,161,84)] bg-[rgb(220,161,84)]/10 px-2 py-0.5 rounded-full">Today</span>}
              </div>
              <div className="divide-y divide-black/5 dark:divide-white/5">
                {MEAL_ORDER.map(mt => {
                  const planned = dayMeals.find(m => m.mealType === mt)
                  const mealLogs = dayLogs.filter(l => l.mealType === mt)
                  if (!planned && mealLogs.length === 0) return null
                  const meta = MEAL_META[mt]
                  return (
                    <div key={mt} className="px-4 py-2.5 flex items-start gap-3">
                      <span className="text-lg shrink-0 w-7 text-center">{meta.emoji}</span>
                      <div className="flex-1 min-w-0 space-y-1.5">
                        {planned && (
                          <p className="text-xs text-gray-400">
                            Planned: <span className="text-gray-600 dark:text-gray-300">{planned.name}</span> · {planned.calories} kcal
                          </p>
                        )}
                        {mealLogs.length > 0 ? mealLogs.map(l => (
                          <div key={l.id} className="flex items-start gap-1.5">
                            {l.description ? <Check size={13} className="text-emerald-500 shrink-0 mt-0.5" /> : <X size={13} className="text-gray-300 shrink-0 mt-0.5" />}
                            <p className="text-sm text-gray-700 dark:text-gray-200 leading-snug">
                              {l.description ?? <em className="not-italic text-gray-400">Skipped</em>}
                            </p>
                          </div>
                        )) : (
                          <p className="text-sm text-gray-300 dark:text-gray-600 italic">Not logged</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
