'use client'
import { useEffect, useState, useCallback } from 'react'
import { Pencil, Check, X, Flame, Beef, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { KCAL_TARGET, PROTEIN_TARGET_MIN, PROTEIN_TARGET_MAX, EATING_WINDOW, EATING_WINDOW_NOTE } from '@/lib/nutritionTargets'

interface MealSlot {
  id: string; dayOfWeek: number; mealType: string; name: string; calories: number; protein: number; notes: string | null
}

const DAYS  = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const CORE_ORDER = ['breakfast', 'snack', 'dinner']
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

function slotMeta(mealType: string) {
  return MEAL_LABELS[mealType] ?? { label: mealType.replace(/_/g, ' '), time: '', emoji: '🍴' }
}

// Core three first in their fixed order, any custom slots after (alphabetical
// by mealType key, which is derived from the name so this reads sensibly).
function sortSlots(slots: MealSlot[]) {
  return [...slots].sort((a, b) => {
    const ai = CORE_ORDER.indexOf(a.mealType), bi = CORE_ORDER.indexOf(b.mealType)
    if (ai !== -1 && bi !== -1) return ai - bi
    if (ai !== -1) return -1
    if (bi !== -1) return 1
    return a.mealType.localeCompare(b.mealType)
  })
}

interface EditForm { name: string; calories: string; protein: string; notes: string }
const EMPTY_FORM: EditForm = { name: '', calories: '', protein: '', notes: '' }

export default function MealPlanPage() {
  const [slots, setSlots]     = useState<MealSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [editId, setEditId]   = useState<string | null>(null)
  const [form, setForm]       = useState<EditForm>(EMPTY_FORM)
  const [saving, setSaving]   = useState(false)
  const [adding, setAdding]   = useState(false)
  const [addForm, setAddForm] = useState<EditForm>(EMPTY_FORM)

  const todayDow = new Date().getDay() || 7
  const [selectedDow, setSelectedDow] = useState(todayDow)

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

  async function removeSlot(id: string) {
    setSlots(prev => prev.filter(s => s.id !== id))
    await fetch('/api/fitness/meal-plan', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
  }

  async function addSlot() {
    if (!addForm.name.trim()) return
    setSaving(true)
    const res = await fetch('/api/fitness/meal-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dayOfWeek: selectedDow, ...addForm }),
    })
    const created = await res.json()
    setSlots(prev => [...prev, created])
    setAddForm(EMPTY_FORM)
    setAdding(false)
    setSaving(false)
  }

  if (loading) return (
    <div className="space-y-4">
      <div className="h-16 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse" />
      <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse" />
    </div>
  )

  const daySlots = sortSlots(slots.filter(s => s.dayOfWeek === selectedDow))
  const selectedTotal = dayTotal(slots, selectedDow)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Meal Plan</h1>
        <p className="text-sm text-gray-400 mt-0.5">Tap a day, then tap any meal to edit</p>
      </div>

      {/* calorie target banner */}
      <div className="bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-900 rounded-2xl px-5 py-3 flex items-center gap-4">
        <Flame size={18} className="text-[rgb(var(--l-green))] shrink-0" />
        <div>
          <p className="text-sm font-semibold text-green-800 dark:text-green-300">Target: {KCAL_TARGET.toLocaleString()} kcal · {PROTEIN_TARGET_MIN}–{PROTEIN_TARGET_MAX}g protein</p>
          <p className="text-xs text-[rgb(var(--l-green))] dark:text-green-500">Eating window {EATING_WINDOW} · {EATING_WINDOW_NOTE}</p>
        </div>
      </div>

      {/* Week-at-a-glance strip */}
      <div className="grid grid-cols-7 gap-2">
        {DAYS_SHORT.map((label, i) => {
          const dow = i + 1
          const total = dayTotal(slots, dow)
          const isSelected = dow === selectedDow
          const isToday = dow === todayDow
          return (
            <button key={dow} onClick={() => setSelectedDow(dow)}
              className={cn('rounded-2xl border p-2.5 text-center transition-all',
                isSelected ? 'border-green-400 dark:border-green-700 bg-green-50 dark:bg-green-950/50 ring-2 ring-green-200 dark:ring-green-900'
                           : 'border-black/5 dark:border-white/5 bg-surface/90 dark:bg-surface/70 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]')}>
              <p className="text-base">{DAY_EMOJI[dow]}</p>
              <p className={cn('text-[11px] font-bold mt-0.5', isSelected ? 'text-green-700 dark:text-green-300' : 'text-gray-500')}>
                {label}{isToday && <span className="block text-[8px] font-normal opacity-70">today</span>}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5 font-mono">{total.calories || '—'}</p>
            </button>
          )
        })}
      </div>

      {/* Selected day detail */}
      <div className="rounded-2xl border border-black/5 dark:border-white/5 overflow-hidden bg-surface/90 dark:bg-surface/70">
        <div className="px-4 py-3 flex items-center justify-between border-b border-black/5 dark:border-white/5">
          <span className="font-bold text-sm text-gray-900 dark:text-gray-100">
            {DAYS[selectedDow - 1]} {selectedDow === todayDow && <span className="text-xs font-normal opacity-60 ml-1">(today)</span>}
          </span>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1"><Flame size={11} className="text-ldg-ink/55" /> {selectedTotal.calories} kcal</span>
            <span className="flex items-center gap-1"><Beef size={11} className="text-red-400" /> {selectedTotal.protein}g</span>
          </div>
        </div>

        <div className="divide-y divide-black/5 dark:divide-white/5">
          {daySlots.map(slot => {
            const meta = slotMeta(slot.mealType)
            const isEditing = editId === slot.id
            return (
              <div key={slot.id} className="px-4 py-3">
                {isEditing ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span>{meta.emoji}</span>
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{meta.label}</span>
                    </div>
                    <textarea
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      className="w-full border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-sm bg-surface dark:bg-surface resize-none"
                      rows={2}
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] text-gray-400 block mb-1">kcal</label>
                        <input type="number" value={form.calories} onChange={e => setForm(f => ({ ...f, calories: e.target.value }))}
                          className="w-full border border-black/10 dark:border-white/10 rounded-lg px-2 py-1.5 text-sm bg-surface dark:bg-surface" />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-400 block mb-1">protein (g)</label>
                        <input type="number" value={form.protein} onChange={e => setForm(f => ({ ...f, protein: e.target.value }))}
                          className="w-full border border-black/10 dark:border-white/10 rounded-lg px-2 py-1.5 text-sm bg-surface dark:bg-surface" />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-400 block mb-1">notes</label>
                        <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                          className="w-full border border-black/10 dark:border-white/10 rounded-lg px-2 py-1.5 text-sm bg-surface dark:bg-surface" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={saveEdit} disabled={saving}
                        className="flex items-center gap-1 bg-[rgb(var(--l-green))] text-white px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-[rgb(var(--l-green))] disabled:opacity-50 transition-colors">
                        <Check size={12} /> Save
                      </button>
                      <button onClick={() => setEditId(null)}
                        className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                        <X size={12} /> Cancel
                      </button>
                      <button onClick={() => removeSlot(slot.id)}
                        className="flex items-center gap-1 text-red-400 hover:text-red-500 px-3 py-1.5 rounded-xl text-xs font-semibold ml-auto transition-colors">
                        <Trash2 size={12} /> Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3 group">
                    <div className="shrink-0 text-center w-8">
                      <span className="text-lg">{meta.emoji}</span>
                      {meta.time && <p className="text-[9px] text-gray-400 leading-none mt-0.5">{meta.time}</p>}
                    </div>
                    <div className="flex-1 min-w-0" onClick={() => startEdit(slot)}>
                      <p className="text-sm text-gray-700 dark:text-gray-200 leading-snug cursor-pointer">{slot.name}</p>
                      {slot.notes && <p className="text-xs text-gray-400 mt-0.5">{slot.notes}</p>}
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-[11px] font-semibold text-ldg-ink/55">{slot.calories} kcal</span>
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

        {/* Add meal */}
        <div className="px-4 py-3 border-t border-black/5 dark:border-white/5">
          {adding ? (
            <div className="space-y-3">
              <input autoFocus value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                placeholder="What's the meal?"
                className="w-full border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-sm bg-surface dark:bg-surface" />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-gray-400 block mb-1">kcal</label>
                  <input type="number" value={addForm.calories} onChange={e => setAddForm(f => ({ ...f, calories: e.target.value }))}
                    className="w-full border border-black/10 dark:border-white/10 rounded-lg px-2 py-1.5 text-sm bg-surface dark:bg-surface" />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 block mb-1">protein (g)</label>
                  <input type="number" value={addForm.protein} onChange={e => setAddForm(f => ({ ...f, protein: e.target.value }))}
                    className="w-full border border-black/10 dark:border-white/10 rounded-lg px-2 py-1.5 text-sm bg-surface dark:bg-surface" />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={addSlot} disabled={saving || !addForm.name.trim()}
                  className="flex items-center gap-1 bg-[rgb(var(--l-green))] text-white px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-[rgb(var(--l-green))] disabled:opacity-50 transition-colors">
                  <Check size={12} /> Add
                </button>
                <button onClick={() => { setAdding(false); setAddForm(EMPTY_FORM) }}
                  className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                  <X size={12} /> Cancel
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setAdding(true)}
              className="flex items-center gap-1.5 text-[13px] font-semibold text-ldg-green hover:underline">
              <Plus size={14} /> Add meal to {DAYS[selectedDow - 1]}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
