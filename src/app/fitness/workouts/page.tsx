'use client'
import { useEffect, useState, useCallback } from 'react'
import { Dumbbell, Plus, Trash2, X, Timer } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { WORKOUT_TYPES as TYPES, workoutTypeConfig } from '@/lib/workoutType'

interface WorkoutEntry {
  id: string; date: string; type: string; duration: number | null; notes: string | null
  source: 'manual' | 'habit'; habitName?: string
}

const typeOf = workoutTypeConfig

function toLocalDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function mondayStr(now: Date) {
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  return toLocalDate(d)
}

export default function WorkoutsPage() {
  const [manualLogs, setManualLogs] = useState<WorkoutEntry[]>([])
  const [habitLogs,  setHabitLogs]  = useState<WorkoutEntry[]>([])
  const [loading,    setLoading]    = useState(true)
  const [showForm,   setShowForm]   = useState(false)
  const [form, setForm] = useState({ type: 'pt', duration: '', notes: '', date: toLocalDate(new Date()) })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const [mRes, hRes] = await Promise.all([
      fetch('/api/fitness/workouts?limit=60'),
      fetch('/api/fitness/habit-workouts?days=30'),
    ])
    const [mData, hData] = await Promise.all([mRes.json(), hRes.json()])
    setManualLogs((mData as WorkoutEntry[]).map(l => ({ ...l, date: l.date.slice(0, 10), source: 'manual' as const })))
    setHabitLogs((hData as WorkoutEntry[]).map(l => ({ ...l, source: 'habit' as const })))
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  // Manual entry wins over habit tick for the same date+type
  const manualKeys = new Set(manualLogs.map(l => `${l.date}|${l.type}`))
  const allLogs = [
    ...manualLogs,
    ...habitLogs.filter(l => !manualKeys.has(`${l.date}|${l.type}`)),
  ].sort((a, b) => b.date.localeCompare(a.date))

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
    load()
  }

  async function del(id: string) {
    await fetch('/api/fitness/workouts', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setManualLogs(l => l.filter(x => x.id !== id))
  }

  const weekStart = mondayStr(new Date())
  const thisWeek  = allLogs.filter(l => l.date >= weekStart)
  const ptCount   = thisWeek.filter(l => l.type === 'pt').length
  const bikeCount = thisWeek.filter(l => l.type === 'cardio_bike').length

  const groups: Record<string, WorkoutEntry[]> = {}
  for (const l of allLogs) (groups[l.date] ??= []).push(l)

  if (loading) return <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse" />)}</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Workouts</h1>
          <p className="text-sm text-gray-400 mt-0.5">From habits + manual logs</p>
        </div>
        <button onClick={() => setShowForm(s => !s)}
          className="flex items-center gap-1.5 bg-[rgb(var(--l-green))] text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-[rgb(var(--l-green))] active:scale-95 transition-all">
          {showForm ? <X size={15} /> : <Plus size={15} />} {showForm ? 'Cancel' : 'Log'}
        </button>
      </div>

      {/* This week stats — Monday-based week */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'PT sessions',   value: ptCount,         icon: '🏋️', target: 3 },
          { label: 'Bike rides',    value: bikeCount,       icon: '🚴', target: 2 },
          { label: 'Total this wk', value: thisWeek.length, icon: '📊', target: 5 },
        ].map(s => (
          <div key={s.label} className="bg-surface/90 dark:bg-surface/70 rounded-2xl border border-black/5 dark:border-white/5 p-4 text-center">
            <span className="text-xl">{s.icon}</span>
            <p className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">
              {s.value}<span className="text-xs font-normal text-gray-400">/{s.target}</span>
            </p>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {habitLogs.length === 0 && (
        <div className="bg-ldg-ink/[0.04] border border-ldg-ink/10 rounded-2xl px-4 py-3 text-sm text-ldg-ink/70">
          Tick <strong>PT Session</strong> or <strong>Bike Ride</strong> in{' '}
          <Link href="/life" className="underline font-semibold">Habits</Link> and they'll appear here automatically.
        </div>
      )}

      {/* Log form */}
      {showForm && (
        <div className="bg-surface/90 dark:bg-surface/70 rounded-2xl border border-black/5 dark:border-white/5 p-5">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <Dumbbell size={16} className="text-[rgb(var(--l-green))]" /> Log workout manually
          </h2>
          <form onSubmit={addLog} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Type</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-sm bg-surface dark:bg-surface">
                  {TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Duration (min)</label>
                <input type="number" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}
                  placeholder="60" className="w-full border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-sm bg-surface dark:bg-surface" />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Date</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-sm bg-surface dark:bg-surface" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Notes</label>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="How did it go?" rows={2}
                className="w-full border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-sm bg-surface dark:bg-surface resize-none" />
            </div>
            <button type="submit" disabled={saving}
              className="w-full bg-[rgb(var(--l-green))] text-white rounded-xl py-2 text-sm font-semibold hover:bg-[rgb(var(--l-green))] disabled:opacity-50 transition-colors">
              {saving ? 'Saving…' : 'Save workout'}
            </button>
          </form>
        </div>
      )}

      {/* History */}
      {allLogs.length === 0 ? (
        <div className="text-center py-16">
          <Dumbbell size={40} className="text-gray-300 dark:text-gray-700 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No workouts yet. Tick a Fitness habit or log manually.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groups).map(([date, entries]) => (
            <div key={date} className="bg-surface/90 dark:bg-surface/70 rounded-2xl border border-black/5 dark:border-white/5 overflow-hidden">
              <div className="px-4 py-3 border-b border-black/5 dark:border-white/5">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  {new Date(date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                </p>
              </div>
              {entries.map(log => {
                const t = typeOf(log.type)
                return (
                  <div key={log.id} className="flex items-center gap-3 px-4 py-3 border-b last:border-0 border-black/5 dark:border-white/5">
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
