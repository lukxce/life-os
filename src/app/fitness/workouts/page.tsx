'use client'
import { useEffect, useState, useCallback } from 'react'
import { Dumbbell, Plus, Trash2, X, Timer } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface WorkoutLog {
  id: string; date: string; type: string; duration: number | null; notes: string | null
  source: 'manual' | 'habit'; habitName?: string
}

const TYPES = [
  { value: 'pt',           label: 'PT Session',     icon: '🏋️', color: 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300' },
  { value: 'cardio_bike',  label: 'Bike Ride',      icon: '🚴', color: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300' },
  { value: 'cardio_other', label: 'Cardio (other)', icon: '🏃', color: 'bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300' },
  { value: 'rest',         label: 'Active Rest',    icon: '🧘', color: 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300' },
  { value: 'other',        label: 'Other',          icon: '⚡', color: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300' },
]

// Maps habit name keywords → workout type
function habitToWorkoutType(name: string): string {
  const n = name.toLowerCase()
  if (n.includes('pt') || n.includes('gym') || n.includes('train') || n.includes('lift') || n.includes('weight')) return 'pt'
  if (n.includes('bike') || n.includes('cycl') || n.includes('ride')) return 'cardio_bike'
  if (n.includes('run') || n.includes('cardio') || n.includes('jog') || n.includes('swim')) return 'cardio_other'
  if (n.includes('walk') || n.includes('rest') || n.includes('yoga') || n.includes('stretch') || n.includes('mobility')) return 'rest'
  return 'other'
}

const typeOf = (v: string) => TYPES.find(t => t.value === v) ?? TYPES[4]

function toLocalDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function groupByDate(logs: WorkoutLog[]) {
  const groups: Record<string, WorkoutLog[]> = {}
  for (const l of logs) {
    const d = l.date.slice(0, 10)
    if (!groups[d]) groups[d] = []
    groups[d].push(l)
  }
  return groups
}

// Fetch last N days of habit-based workout completions from /api/life/today
async function fetchHabitWorkouts(days = 30): Promise<WorkoutLog[]> {
  const results: WorkoutLog[] = []
  const fetches: Promise<void>[] = []

  for (let i = 0; i < days; i++) {
    const d = new Date(); d.setDate(d.getDate() - i)
    const dateStr = toLocalDate(d)
    fetches.push(
      fetch(`/api/life/today?date=${dateStr}`)
        .then(r => r.json())
        .then((items: { habit: { id: string; name: string; category: string }; log: { completed: boolean } | null; isScheduled: boolean }[]) => {
          for (const item of items) {
            if (!item.isScheduled) continue
            if (!item.log?.completed) continue
            const cat = (item.habit.category ?? '').toLowerCase()
            const isFitness = cat.includes('fitness') || cat.includes('exercise') || cat.includes('sport') || cat.includes('workout') || cat.includes('training')
            if (!isFitness) continue
            results.push({
              id: `habit-${item.habit.id}-${dateStr}`,
              date: dateStr,
              type: habitToWorkoutType(item.habit.name),
              duration: null,
              notes: null,
              source: 'habit',
              habitName: item.habit.name,
            })
          }
        })
        .catch(() => {})
    )
  }

  await Promise.all(fetches)
  return results
}

export default function WorkoutsPage() {
  const [manualLogs, setManualLogs] = useState<WorkoutLog[]>([])
  const [habitLogs,  setHabitLogs]  = useState<WorkoutLog[]>([])
  const [loading,    setLoading]    = useState(true)
  const [showForm,   setShowForm]   = useState(false)
  const [form, setForm] = useState({ type: 'pt', duration: '', notes: '', date: toLocalDate(new Date()) })
  const [saving, setSaving] = useState(false)

  const loadManual = useCallback(async () => {
    const res = await fetch('/api/fitness/workouts?limit=60')
    const data: WorkoutLog[] = await res.json()
    setManualLogs(data.map(l => ({ ...l, source: 'manual' as const })))
  }, [])

  const loadHabits = useCallback(async () => {
    const data = await fetchHabitWorkouts(30)
    setHabitLogs(data)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    await Promise.all([loadManual(), loadHabits()])
    setLoading(false)
  }, [loadManual, loadHabits])

  useEffect(() => { load() }, [load])

  // Merge: manual wins over habit for same date+type (deduplicate)
  const allLogs = [...manualLogs, ...habitLogs].sort((a, b) => b.date.localeCompare(a.date))

  async function addLog(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await fetch('/api/fitness/workouts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, duration: form.duration ? +form.duration : null }),
    })
    setSaving(false)
    setShowForm(false)
    setForm({ type: 'pt', duration: '', notes: '', date: toLocalDate(new Date()) })
    loadManual()
  }

  async function del(id: string) {
    await fetch('/api/fitness/workouts', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setManualLogs(l => l.filter(x => x.id !== id))
  }

  const now = new Date()
  const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - now.getDay())
  const thisWeek = allLogs.filter(l => new Date(l.date) >= startOfWeek)
  const ptCount   = thisWeek.filter(l => l.type === 'pt').length
  const bikeCount = thisWeek.filter(l => l.type === 'cardio_bike').length
  const groups    = groupByDate(allLogs)

  if (loading) return <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse" />)}</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Workouts</h1>
          <p className="text-sm text-gray-400 mt-0.5">From habits + manual logs</p>
        </div>
        <button onClick={() => setShowForm(s => !s)}
          className="flex items-center gap-1.5 bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors">
          {showForm ? <X size={15} /> : <Plus size={15} />} {showForm ? 'Cancel' : 'Log'}
        </button>
      </div>

      {/* This week stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'PT sessions',   value: ptCount,        icon: '🏋️', target: 3 },
          { label: 'Bike rides',    value: bikeCount,      icon: '🚴', target: 2 },
          { label: 'Total this wk', value: thisWeek.length, icon: '📊', target: 5 },
        ].map(s => (
          <div key={s.label} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 text-center">
            <span className="text-xl">{s.icon}</span>
            <p className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">
              {s.value}<span className="text-xs font-normal text-gray-400">/{s.target}</span>
            </p>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Hint banner */}
      {habitLogs.length === 0 && !loading && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-2xl px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
          Tip: habits in a <strong>Fitness</strong>, <strong>Exercise</strong>, or <strong>Workout</strong> category will appear here automatically when you mark them done.{' '}
          <Link href="/life/habits" className="underline font-semibold">Manage habits →</Link>
        </div>
      )}

      {/* Log form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <Dumbbell size={16} className="text-green-600" /> Log workout manually
          </h2>
          <form onSubmit={addLog} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Type</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-800">
                  {TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Duration (min)</label>
                <input type="number" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}
                  placeholder="60" className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-800" />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Date</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-800" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Notes</label>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="How did it go?" rows={2}
                className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-800 resize-none" />
            </div>
            <button type="submit" disabled={saving}
              className="w-full bg-green-600 text-white rounded-xl py-2 text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors">
              {saving ? 'Saving…' : 'Save workout'}
            </button>
          </form>
        </div>
      )}

      {/* History */}
      {Object.keys(groups).length === 0 ? (
        <div className="text-center py-16">
          <Dumbbell size={40} className="text-gray-300 dark:text-gray-700 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No workouts yet. Mark a Fitness habit done or log manually.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groups).map(([date, entries]) => (
            <div key={date} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-50 dark:border-gray-800">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  {new Date(date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                </p>
              </div>
              {entries.map(log => {
                const t = typeOf(log.type)
                return (
                  <div key={log.id} className="flex items-center gap-3 px-4 py-3 border-b last:border-0 border-gray-50 dark:border-gray-800">
                    <span className="text-xl w-8 text-center shrink-0">{t.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', t.color)}>
                          {log.source === 'habit' && log.habitName ? log.habitName : t.label}
                        </span>
                        {log.duration && (
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Timer size={10} /> {log.duration} min
                          </span>
                        )}
                        {log.source === 'habit' && (
                          <span className="text-[10px] text-gray-400 italic">from habits</span>
                        )}
                      </div>
                      {log.notes && <p className="text-xs text-gray-500 mt-1 truncate">{log.notes}</p>}
                    </div>
                    {log.source === 'manual' && (
                      <button onClick={() => del(log.id)} className="text-gray-300 hover:text-red-400 transition-colors shrink-0">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
