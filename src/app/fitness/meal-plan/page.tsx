'use client'
import { useEffect, useState, useCallback } from 'react'
import { Pencil, Check, X, Flame, Beef } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MealSlot {
  id: string; dayOfWeek: number; mealType: string; name: string; calories: number; protein: number; notes: string | null
}

const DAYS  = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const MEALS = ['breakfast', 'snack', 'dinner'] as const
const MEAL_LABELS: Record<string, { label: string; time: string; emoji: string }> = {
  breakfast: { label: 'Breakfast', time: '12:00', emoji: '🍳' },
  snack:     { label: 'Snack',     time: '15:30', emoji: '🥤' },
  dinner:    { label: 'Dinner',    time: '19:00', emoji: '🍽️' },
}
const DAY_EMOJI: Record<number, string> = { 1:'🏋️', 2:'🚴', 3:'🏋️', 4:'🧘', 5:'🏋️', 6:'🚴', 7:'😴' }

function dayTotal(slots: MealSlot[], dow: number) {
  const d = slots.filter(s => s.dayOfWeek === dow)
  return { calories: d.reduce((a, s) => a + s.calories, 0), protein: d.reduce((a, s) => a + s.protein, 0) }
}

interface EditForm { name: string; calories: string; protein: string; notes: string }

export default function MealPlanPage() {
  const [slots, setSlots]     = useState<MealSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [editId, setEditId]   = useState<string | null>(null)
  const [form, setForm]       = useState<EditForm>({ name: '', calories: '', protein: '', notes: '' })
  const [saving, setSaving]   = useState(false)

  const load = useCallback(async () => {
    const res = await fetch('/api/fitness/meal-plan')
    setSlots(await res.json())
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  function startEdit(slot: MealSlot) {
    setEditId(slot.id)
    setForm({ name: slot.name, calories: String(slot.calories), protein: String(slot.protein), notes: slot.notes ?? '' })
  }

  async function saveEdit() {
    if (!editId) return
    setSaving(true)
    const res = await fetch('/api/fitness/meal-plan', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editId, ...form }),
    })
    const updated = await res.json()
    setSlots(prev => prev.map(s => s.id === editId ? updated : s))
    setEditId(null)
    setSaving(false)
  }

  const todayDow = new Date().getDay() || 7

  if (loading) return (
    <div className="space-y-4">
      {[1,2,3].map(i => <div key={i} className="h-48 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse" />)}
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Meal Plan</h1>
        <p className="text-sm text-gray-400 mt-0.5">Weekly timetable · tap any meal to edit</p>
      </div>

      {/* calorie target banner */}
      <div className="bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-900 rounded-2xl px-5 py-3 flex items-center gap-4">
        <Flame size={18} className="text-[rgb(220,161,84)] shrink-0" />
        <div>
          <p className="text-sm font-semibold text-green-800 dark:text-green-300">Target: 2,100 kcal · 140–160g protein</p>
          <p className="text-xs text-[rgb(220,161,84)] dark:text-green-500">Eating window 12:00 – 20:00 · 16:8 IF</p>
        </div>
      </div>

      {/* Day cards */}
      <div className="space-y-5">
        {DAYS.map((dayName, i) => {
          const dow   = i + 1
          const isToday = dow === todayDow
          const total = dayTotal(slots, dow)

          return (
            <div key={dow}
              className={cn('rounded-2xl border overflow-hidden',
                isToday ? 'border-green-400 dark:border-green-700 ring-2 ring-green-200 dark:ring-green-900'
                        : 'border-black/5 dark:border-white/5')}>

              {/* Day header */}
              <div className={cn('px-4 py-3 flex items-center justify-between',
                isToday ? 'bg-green-50 dark:bg-green-950/60' : 'bg-surface/90 dark:bg-surface/70')}>
                <div className="flex items-center gap-2">
                  <span className="text-lg">{DAY_EMOJI[dow]}</span>
                  <span className={cn('font-bold text-sm', isToday ? 'text-green-700 dark:text-green-300' : 'text-gray-900 dark:text-gray-100')}>
                    {dayName} {isToday && <span className="text-xs font-normal ml-1 opacity-70">(today)</span>}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><Flame size={11} className="text-orange-400" /> {total.calories} kcal</span>
                  <span className="flex items-center gap-1"><Beef size={11} className="text-red-400" /> {total.protein}g</span>
                </div>
              </div>

              {/* Meals */}
              <div className={cn('divide-y divide-black/5 dark:divide-white/5', isToday ? 'bg-green-50/30 dark:bg-green-950/20' : 'bg-surface/90 dark:bg-surface/70')}>
                {MEALS.map(mealType => {
                  const slot = slots.find(s => s.dayOfWeek === dow && s.mealType === mealType)
                  if (!slot) return null
                  const ml = MEAL_LABELS[mealType]
                  const isEditing = editId === slot.id

                  return (
                    <div key={mealType} className="px-4 py-3">
                      {isEditing ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 mb-2">
                            <span>{ml.emoji}</span>
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{ml.label}</span>
                          </div>
                          <textarea
                            value={form.name}
                            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                            className="w-full border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-800 resize-none"
                            rows={2}
                          />
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="text-[10px] text-gray-400 block mb-1">kcal</label>
                              <input type="number" value={form.calories} onChange={e => setForm(f => ({ ...f, calories: e.target.value }))}
                                className="w-full border border-black/10 dark:border-white/10 rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-gray-800" />
                            </div>
                            <div>
                              <label className="text-[10px] text-gray-400 block mb-1">protein (g)</label>
                              <input type="number" value={form.protein} onChange={e => setForm(f => ({ ...f, protein: e.target.value }))}
                                className="w-full border border-black/10 dark:border-white/10 rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-gray-800" />
                            </div>
                            <div>
                              <label className="text-[10px] text-gray-400 block mb-1">notes</label>
                              <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                                className="w-full border border-black/10 dark:border-white/10 rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-gray-800" />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={saveEdit} disabled={saving}
                              className="flex items-center gap-1 bg-[rgb(220,161,84)] text-white px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-[rgb(200,141,64)] disabled:opacity-50 transition-colors">
                              <Check size={12} /> Save
                            </button>
                            <button onClick={() => setEditId(null)}
                              className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                              <X size={12} /> Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-3 group">
                          <div className="shrink-0 text-center w-8">
                            <span className="text-lg">{ml.emoji}</span>
                            <p className="text-[9px] text-gray-400 leading-none mt-0.5">{ml.time}</p>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-700 dark:text-gray-200 leading-snug">{slot.name}</p>
                            {slot.notes && <p className="text-xs text-gray-400 mt-0.5">{slot.notes}</p>}
                            <div className="flex items-center gap-3 mt-1.5">
                              <span className="text-[11px] font-semibold text-orange-500">{slot.calories} kcal</span>
                              <span className="text-[11px] font-semibold text-red-500">{slot.protein}g protein</span>
                            </div>
                          </div>
                          <button onClick={() => startEdit(slot)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all">
                            <Pencil size={13} />
                          </button>
                        </div>
                      )}
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
