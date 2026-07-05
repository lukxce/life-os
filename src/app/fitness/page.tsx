'use client'
import { useEffect, useState, useCallback } from 'react'
import { Flame, Beef, ChevronRight, Scale, Droplets, Footprints, Moon } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface MealSlot { id: string; dayOfWeek: number; mealType: string; name: string; calories: number; protein: number }
interface WorkoutLog { id: string; date: string; type: string; duration: number | null }
interface BodyRow   { id: string; date: string; metric: string; value: number }

const DAY_PLAN: Record<number, { activity: string; emoji: string; desc: string }> = {
  1: { activity: 'PT Session',  emoji: '🏋️', desc: 'Mon · 60 min gym' },
  2: { activity: 'Bike Ride',   emoji: '🚴', desc: 'Tue · 45–60 min Zone 2' },
  3: { activity: 'PT Session',  emoji: '🏋️', desc: 'Wed · 60 min gym' },
  4: { activity: 'Active Rest', emoji: '🧘', desc: 'Thu · long walk 40–50 min' },
  5: { activity: 'PT Session',  emoji: '🏋️', desc: 'Fri · 60 min gym' },
  6: { activity: 'Long Ride',   emoji: '🚴', desc: 'Sat · 60–75 min Zone 2' },
  7: { activity: 'Full Rest',   emoji: '😴', desc: 'Sun · casual walk only' },
}

const MEAL_ORDER = ['breakfast', 'snack', 'dinner']
const MEAL_META: Record<string, { emoji: string; time: string }> = {
  breakfast: { emoji: '🍳', time: '12:00' },
  snack:     { emoji: '🥤', time: '15:30' },
  dinner:    { emoji: '🍽️', time: '19:00' },
}

function toLocalDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function FitnessTodayPage() {
  const [meals,    setMeals]    = useState<MealSlot[]>([])
  const [workouts, setWorkouts] = useState<WorkoutLog[]>([])
  const [weight,   setWeight]   = useState<BodyRow | null>(null)
  const [loading,  setLoading]  = useState(true)

  const todayDow = (new Date().getDay() || 7)
  const todayStr = toLocalDate(new Date())
  const plan     = DAY_PLAN[todayDow]

  const load = useCallback(async () => {
    const [mRes, wRes, hRes, bRes] = await Promise.all([
      fetch('/api/fitness/meal-plan'),
      fetch('/api/fitness/workouts?limit=7'),
      fetch('/api/fitness/habit-workouts?days=2'),
      fetch('/api/life/body-metrics?metrics=weight'),
    ])
    const [mData, wData, hData, bData] = await Promise.all([mRes.json(), wRes.json(), hRes.json(), bRes.json()])
    setMeals(mData)
    setWorkouts([...(wData as WorkoutLog[]), ...(hData as WorkoutLog[])])
    const weightRows = (bData as BodyRow[]).filter(r => r.metric === 'weight')
    setWeight(weightRows.at(-1) ?? null)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const todayMeals   = meals.filter(m => m.dayOfWeek === todayDow)
  const totalCal     = todayMeals.reduce((a, m) => a + m.calories, 0)
  const totalProt    = todayMeals.reduce((a, m) => a + m.protein, 0)
  // Day is "done" when the planned workout type is logged (PT on PT days, bike on bike days; rest days accept anything)
  const expectedType: Record<number, string | null> = { 1: 'pt', 2: 'cardio_bike', 3: 'pt', 4: null, 5: 'pt', 6: 'cardio_bike', 7: null }
  const wanted = expectedType[todayDow]
  const todayWorkout = workouts.find(w => w.date.slice(0, 10) === todayStr && (wanted == null || w.type === wanted))

  const today = new Date()
  const greeting = today.getHours() < 12 ? 'Good morning' : today.getHours() < 17 ? 'Good afternoon' : 'Good evening'

  if (loading) return (
    <div className="space-y-4">
      {[1,2,3].map(i => <div key={i} className="h-28 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse" />)}
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{greeting} 💪</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          {today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* Today's workout */}
      <div className={cn('rounded-2xl p-4 flex items-center gap-4',
        todayWorkout ? 'bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-900'
                     : 'bg-white dark:bg-gray-900 border border-black/5 dark:border-white/5')}>
        <span className="text-3xl">{plan.emoji}</span>
        <div className="flex-1">
          <p className="font-bold text-gray-900 dark:text-white">{plan.activity}</p>
          <p className="text-xs text-gray-400">{plan.desc}</p>
        </div>
        {todayWorkout ? (
          <span className="text-xs font-semibold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900 px-2.5 py-1 rounded-full">✓ Done</span>
        ) : (
          <Link href="/fitness/workouts"
            className="text-xs font-semibold text-white bg-green-600 px-3 py-1.5 rounded-xl hover:bg-green-700 transition-colors whitespace-nowrap">
            Log it
          </Link>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-black/5 dark:border-white/5 p-4 text-center">
          <Flame size={18} className="text-orange-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-gray-900 dark:text-white">{totalCal}</p>
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">kcal today</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-black/5 dark:border-white/5 p-4 text-center">
          <Beef size={18} className="text-red-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-gray-900 dark:text-white">{totalProt}g</p>
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">protein</p>
        </div>
        <Link href="/fitness/body" className="bg-white dark:bg-gray-900 rounded-2xl border border-black/5 dark:border-white/5 p-4 text-center hover:border-gray-200 dark:hover:border-gray-700 transition-colors">
          <Scale size={18} className="text-purple-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-gray-900 dark:text-white">{weight ? `${weight.value}` : '—'}</p>
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">kg · last</p>
        </Link>
      </div>

      {/* Today's meals */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-black/5 dark:border-white/5 overflow-hidden">
        <div className="px-4 py-3 border-b border-black/5 dark:border-white/5 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Today's meals</h2>
          <Link href="/fitness/meal-plan" className="text-xs text-green-600 dark:text-green-400 hover:underline flex items-center gap-1">
            Full plan <ChevronRight size={12} />
          </Link>
        </div>
        {todayMeals.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-gray-400">No meal plan found.</div>
        ) : (
          <div className="divide-y divide-black/5 dark:divide-white/5">
            {MEAL_ORDER.map(mt => {
              const meal = todayMeals.find(m => m.mealType === mt)
              if (!meal) return null
              const meta = MEAL_META[mt]
              return (
                <div key={mt} className="flex items-start gap-3 px-4 py-3">
                  <div className="shrink-0 text-center w-8">
                    <span className="text-lg">{meta.emoji}</span>
                    <p className="text-[9px] text-gray-400 leading-none mt-0.5">{meta.time}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 dark:text-gray-200 leading-snug">{meal.name}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[11px] font-semibold text-orange-500">{meal.calories} kcal</span>
                      <span className="text-[11px] font-semibold text-red-500">{meal.protein}g protein</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between border-t border-black/5 dark:border-white/5">
          <span className="text-xs text-gray-400">Total</span>
          <div className="flex items-center gap-4">
            <span className="text-xs font-bold text-orange-500">{totalCal} kcal</span>
            <span className="text-xs font-bold text-red-500">{totalProt}g protein</span>
          </div>
        </div>
      </div>

      {/* Daily non-negotiables */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-black/5 dark:border-white/5 overflow-hidden">
        <div className="px-4 py-3 border-b border-black/5 dark:border-white/5">
          <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Daily non-negotiables</h2>
        </div>
        <div className="divide-y divide-black/5 dark:divide-white/5">
          {[
            { icon: <Footprints size={16} />, label: '10,000 steps', color: 'text-blue-500',   target: 'min daily' },
            { icon: <Droplets size={16} />,   label: '3L water',     color: 'text-cyan-500',   target: 'stay hydrated' },
            { icon: <Moon size={16} />,        label: '7.5h sleep',   color: 'text-indigo-500', target: 'lights out 23:30' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-3 px-4 py-3">
              <span className={item.color}>{item.icon}</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{item.label}</p>
                <p className="text-xs text-gray-400">{item.target}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
