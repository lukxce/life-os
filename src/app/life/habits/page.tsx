'use client'
import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Pencil, Trash2, ChevronUp, ChevronDown, X, Check, Plus, PauseCircle, PlayCircle, Search } from 'lucide-react'

interface SubTask { id: string; name: string; order: number }

interface Habit {
  id: string
  name: string
  category: string
  type: string
  icon?: string | null
  color?: string | null
  unit?: string | null
  target?: number | null
  frequency: string
  frequencyDays: number[]
  timeOfDay: string
  order: number
  active: boolean
  paused: boolean
  createdAt: string
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const defaultForm = {
  name: '',
  category: '',
  type: 'boolean',
  icon: '',
  color: '#3b82f6',
  unit: '',
  target: '',
  frequency: 'daily',
  frequencyDays: [] as number[],
  timeOfDay: 'all_day',
  active: true,
}

function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ ...defaultForm })
  const [editId, setEditId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [subTasks, setSubTasks] = useState<SubTask[]>([])
  const [newSubTask, setNewSubTask] = useState('')

  const searchParams = useSearchParams()

  const load = useCallback(async () => {
    const res = await fetch('/api/life/habits')
    setHabits(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (searchParams.get('add') === '1') setShowForm(true)
  }, [searchParams])

  const categories = Array.from(new Set(habits.map((h) => h.category)))

  async function saveHabit() {
    if (!form.name.trim() || !form.category.trim()) return
    const body = {
      ...form,
      target: form.target ? Number(form.target) : null,
      unit: form.unit || null,
      icon: form.icon || null,
      frequencyDays: form.frequencyDays,
    }
    if (editId) {
      const res = await fetch('/api/life/habits', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editId, ...body }),
      })
      const updated = await res.json()
      setHabits((prev) => prev.map((h) => (h.id === editId ? updated : h)))
    } else {
      const res = await fetch('/api/life/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const created = await res.json()
      setHabits((prev) => [...prev, created])
    }
    resetForm()
  }

  function resetForm() {
    setForm({ ...defaultForm })
    setEditId(null)
    setShowForm(false)
    setSubTasks([])
    setNewSubTask('')
  }

  async function loadSubTasks(habitId: string) {
    const res = await fetch(`/api/life/subtasks?habitId=${habitId}`)
    setSubTasks(await res.json())
  }

  async function addSubTask() {
    if (!newSubTask.trim() || !editId) return
    const res = await fetch('/api/life/subtasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ habitId: editId, name: newSubTask.trim() }),
    })
    const created = await res.json()
    setSubTasks((prev) => [...prev, created])
    setNewSubTask('')
  }

  async function deleteSubTask(id: string) {
    await fetch('/api/life/subtasks', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setSubTasks((prev) => prev.filter((s) => s.id !== id))
  }

  function startEdit(h: Habit) {
    setForm({
      name: h.name,
      category: h.category,
      type: h.type,
      icon: h.icon ?? '',
      color: h.color ?? '#3b82f6',
      unit: h.unit ?? '',
      target: h.target != null ? String(h.target) : '',
      frequency: h.frequency,
      frequencyDays: h.frequencyDays ?? [],
      timeOfDay: h.timeOfDay ?? 'all_day',
      active: h.active,
    })
    setEditId(h.id)
    setShowForm(true)
    loadSubTasks(h.id)
  }

  async function deleteHabit(id: string) {
    await fetch('/api/life/habits', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setHabits((prev) => prev.filter((h) => h.id !== id))
    setDeleteId(null)
  }

  async function toggleActive(h: Habit) {
    const res = await fetch('/api/life/habits', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: h.id, active: !h.active }),
    })
    const updated = await res.json()
    setHabits((prev) => prev.map((x) => (x.id === h.id ? updated : x)))
  }

  async function moveOrder(h: Habit, dir: -1 | 1) {
    const sorted = [...habits].sort((a, b) => a.order - b.order)
    const idx = sorted.findIndex((x) => x.id === h.id)
    const swapIdx = idx + dir
    if (swapIdx < 0 || swapIdx >= sorted.length) return
    const other = sorted[swapIdx]

    await Promise.all([
      fetch('/api/life/habits', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: h.id, order: other.order }),
      }),
      fetch('/api/life/habits', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: other.id, order: h.order }),
      }),
    ])
    await load()
  }

  const [searchText, setSearchText] = useState('')

  const filteredHabits = searchText
    ? habits.filter(h =>
        h.name.toLowerCase().includes(searchText.toLowerCase()) ||
        h.category.toLowerCase().includes(searchText.toLowerCase())
      )
    : habits

  const grouped = filteredHabits.reduce<Record<string, Habit[]>>((acc, h) => {
    if (!acc[h.category]) acc[h.category] = []
    acc[h.category].push(h)
    return acc
  }, {})

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Manage Habits</h1>
        <button
          onClick={() => { resetForm(); setShowForm(true) }}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors min-h-[44px]"
        >
          + Add habit
        </button>
      </div>

      {habits.length > 3 && (
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search habits…"
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            className="w-full bg-gray-50 dark:bg-gray-800 border border-black/10 dark:border-white/10 rounded-xl pl-8 pr-3 py-2 text-sm outline-none focus:border-blue-500"
          />
          {searchText && (
            <button onClick={() => setSearchText('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={13} />
            </button>
          )}
        </div>
      )}

      {habits.length === 0 && !showForm && (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-3">📋</div>
          <p className="font-medium text-gray-600 dark:text-gray-300">No habits yet</p>
          <p className="text-sm mt-1">Click &quot;Add habit&quot; to get started</p>
        </div>
      )}

      {Object.entries(grouped).map(([category, catHabits]) => (
        <section key={category}>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
            {category}
          </h2>
          <div className="space-y-2">
            {catHabits
              .sort((a, b) => a.order - b.order)
              .map((h) => (
                <div
                  key={h.id}
                  className="flex items-center gap-3 p-3 bg-surface/90 dark:bg-surface/70 border border-black/5 dark:border-white/5 rounded-xl"
                >
                  <span className="text-xl">{h.icon ?? '📋'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn('font-medium text-sm', !h.active && 'text-gray-400 line-through', h.paused && 'text-amber-600 dark:text-amber-400')}>
                        {h.name}
                      </span>
                      {h.paused && <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 font-medium">Paused</span>}
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                        {h.type}
                      </span>
                      {h.type === 'quantity' && (
                        <span className="text-xs text-gray-500">
                          {h.target} {h.unit}
                        </span>
                      )}
                      <span className="text-xs text-gray-400">{h.frequency}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => moveOrder(h, -1)}
                      className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 min-h-[36px] min-w-[36px] flex items-center justify-center"
                    >
                      <ChevronUp size={16} />
                    </button>
                    <button
                      onClick={() => moveOrder(h, 1)}
                      className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 min-h-[36px] min-w-[36px] flex items-center justify-center"
                    >
                      <ChevronDown size={16} />
                    </button>
                    <button
                      onClick={() => toggleActive(h)}
                      title={h.active ? 'Deactivate' : 'Activate'}
                      className={cn(
                        'px-2 py-1 text-xs rounded-full font-medium min-h-[36px] transition-colors',
                        h.active && !h.paused
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-100 text-gray-500 dark:bg-gray-800'
                      )}
                    >
                      {h.active ? 'Active' : 'Inactive'}
                    </button>
                    {h.active && (
                      <button
                        onClick={() => fetch('/api/life/habits', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: h.id, paused: !h.paused }) }).then(load)}
                        title={h.paused ? 'Resume habit' : 'Pause habit'}
                        className={cn(
                          'p-1.5 rounded-full min-h-[36px] min-w-[36px] flex items-center justify-center transition-colors',
                          h.paused
                            ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100'
                            : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                        )}
                      >
                        {h.paused ? <PlayCircle size={16} /> : <PauseCircle size={16} />}
                      </button>
                    )}
                    <button
                      onClick={() => startEdit(h)}
                      className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 min-h-[36px] min-w-[36px] flex items-center justify-center"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setDeleteId(h.id)}
                      className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 min-h-[36px] min-w-[36px] flex items-center justify-center"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </section>
      ))}

      {/* Add / Edit form */}
      {showForm && (
        <div className="bg-surface/90 dark:bg-surface/70 border border-black/5 dark:border-white/5 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{editId ? 'Edit habit' : 'New habit'}</h3>
            <button onClick={resetForm} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Name *</label>
              <input
                className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-surface dark:bg-surface"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Morning run"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Category *</label>
              <input
                list="category-list"
                className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-surface dark:bg-surface"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="e.g. Health & Body"
              />
              <datalist id="category-list">
                {categories.map((c) => <option key={c} value={c} />)}
                <option value="Weekly Check-in" />
              </datalist>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Icon (emoji)</label>
              <input
                className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-surface dark:bg-surface"
                value={form.icon}
                onChange={(e) => setForm({ ...form, icon: e.target.value })}
                placeholder="🏃"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Color</label>
              <input
                type="color"
                className="w-full h-10 border border-gray-300 dark:border-gray-700 rounded-lg px-1 bg-surface dark:bg-surface cursor-pointer"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Time of day</label>
            <div className="flex gap-2 flex-wrap">
              {[
                { value: 'morning', label: '🌅 Morning' },
                { value: 'noon', label: '☀️ Noon' },
                { value: 'night', label: '🌙 Night' },
                { value: 'all_day', label: '🕐 All Day' },
              ].map((t) => (
                <button
                  key={t.value}
                  onClick={() => setForm({ ...form, timeOfDay: t.value })}
                  className={cn(
                    'px-3 py-1.5 text-sm rounded-lg border transition-colors min-h-[44px]',
                    form.timeOfDay === t.value
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Type</label>
            <div className="flex gap-2">
              {['boolean', 'quantity'].map((t) => (
                <button
                  key={t}
                  onClick={() => setForm({ ...form, type: t })}
                  className={cn(
                    'px-3 py-1.5 text-sm rounded-lg border transition-colors min-h-[44px]',
                    form.type === t
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                  )}
                >
                  {t === 'boolean' ? 'Boolean (yes/no)' : 'Quantity (number)'}
                </button>
              ))}
            </div>
          </div>

          {form.type === 'quantity' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Unit</label>
                <input
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-surface dark:bg-surface"
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  placeholder="ml, km, glasses..."
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Target</label>
                <input
                  type="number"
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-surface dark:bg-surface"
                  value={form.target}
                  onChange={(e) => setForm({ ...form, target: e.target.value })}
                  placeholder="2000"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs text-gray-500 mb-1">Frequency</label>
            <select
              className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-surface dark:bg-surface"
              value={form.frequency}
              onChange={(e) => {
                const v = e.target.value
                if (v === 'weekly_sunday') {
                  setForm({ ...form, frequency: 'specific_days', frequencyDays: [0] })
                } else {
                  setForm({ ...form, frequency: v, frequencyDays: [] })
                }
              }}
            >
              <option value="daily">Daily</option>
              <option value="every_other_day">Every other day</option>
              <option value="every_n_days">Every N days</option>
              <option value="specific_days">Specific days</option>
              <option value="weekly_sunday">Weekly (Sundays)</option>
            </select>
          </div>

          {form.frequency === 'specific_days' && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Days</label>
              <div className="flex gap-1 flex-wrap">
                {DAYS.map((d, i) => (
                  <button
                    key={d}
                    onClick={() => {
                      const days = form.frequencyDays.includes(i)
                        ? form.frequencyDays.filter((x) => x !== i)
                        : [...form.frequencyDays, i]
                      setForm({ ...form, frequencyDays: days })
                    }}
                    className={cn(
                      'px-2.5 py-1.5 text-xs rounded-lg border min-h-[36px]',
                      form.frequencyDays.includes(i)
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-gray-300 dark:border-gray-700'
                    )}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          )}

          {form.frequency === 'every_n_days' && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Every N days</label>
              <input
                type="number"
                min="2"
                className="w-24 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-surface dark:bg-surface"
                value={form.frequencyDays[0] ?? 2}
                onChange={(e) => setForm({ ...form, frequencyDays: [Number(e.target.value)] })}
              />
            </div>
          )}

          {/* Sub-tasks (only when editing an existing habit) */}
          {editId && (
            <div>
              <label className="block text-xs text-gray-500 mb-2">Sub-tasks (optional checklist)</label>
              <div className="space-y-1 mb-2">
                {subTasks.map((st) => (
                  <div key={st.id} className="flex items-center gap-2 text-sm">
                    <span className="flex-1 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 rounded-lg">{st.name}</span>
                    <button
                      onClick={() => deleteSubTask(st.id)}
                      className="text-gray-400 hover:text-red-500 p-1"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  className="flex-1 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-surface dark:bg-surface"
                  placeholder="e.g. Apply moisturiser"
                  value={newSubTask}
                  onChange={(e) => setNewSubTask(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addSubTask()}
                />
                <button
                  onClick={addSubTask}
                  className="px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors min-h-[44px]"
                >
                  <Plus size={16} />
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">Completing all sub-tasks auto-marks the habit done</p>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={saveHabit}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors min-h-[44px]"
            >
              <Check size={15} />
              {editId ? 'Save changes' : 'Add habit'}
            </button>
            <button
              onClick={resetForm}
              className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors min-h-[44px]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-surface/90 dark:bg-surface/70 rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-semibold mb-2">Delete habit?</h3>
            <p className="text-sm text-gray-500 mb-4">
              This will permanently delete the habit and all its logs.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => deleteHabit(deleteId)}
                className="flex-1 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 min-h-[44px]"
              >
                Delete
              </button>
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 py-2 border border-gray-300 dark:border-gray-700 text-sm rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 min-h-[44px]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function HabitsPageWrapper() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">Loading...</div>}>
      <HabitsPage />
    </Suspense>
  )
}
