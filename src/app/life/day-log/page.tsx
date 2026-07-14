'use client'
import { useEffect, useState, useCallback } from 'react'
import { Card, Label } from '@/components/ledger/primitives'
import { cn } from '@/lib/utils'
import { Droplet, ListChecks, UtensilsCrossed, Dumbbell, Receipt } from 'lucide-react'

const MOODS = ['😞', '😕', '😐', '🙂', '😄']

type Summary = {
  habitsDone: number; habitsTotal: number; habitNames: string[]
  waterMl: number; mealsLogged: number; mealsSkipped: number
  tasksDone: number; tasksTotal: number; expensesLogged: number; workoutsLogged: number
}
type LogEntry = { id: string; date: string; mood: string | null; notes: string | null }

function toLocalISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function DayLogPage() {
  const todayStr = toLocalISODate(new Date())
  const [summary, setSummary] = useState<Summary | null>(null)
  const [log, setLog] = useState<LogEntry | null>(null)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [history, setHistory] = useState<LogEntry[]>([])

  const load = useCallback(async () => {
    const [todayRes, historyRes] = await Promise.all([
      fetch(`/api/life/day-log?date=${todayStr}`).then(r => r.json()),
      fetch('/api/life/day-log?limit=14').then(r => r.json()),
    ])
    setLog(todayRes.log)
    setSummary(todayRes.summary)
    setNotes(todayRes.log?.notes ?? '')
    setHistory(historyRes.filter((e: LogEntry) => e.date.slice(0, 10) !== todayStr))
  }, [todayStr])

  useEffect(() => { load() }, [load])

  async function saveMood(mood: string) {
    setLog(prev => prev ? { ...prev, mood } : { id: '', date: todayStr, mood, notes: null })
    await fetch('/api/life/day-log', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: todayStr, mood }),
    })
  }

  async function saveNotes() {
    setSaving(true)
    await fetch('/api/life/day-log', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: todayStr, notes }),
    })
    setSaving(false)
    load()
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-8">
      <div>
        <h1 className="text-2xl font-bold text-ldg-ink">Day Log</h1>
        <p className="text-sm text-ldg-ink/55 mt-0.5">A quick daily check-in — today's picture is filled in for you.</p>
      </div>

      <Card className="p-5">
        <Label>Today, auto-filled</Label>
        {summary ? (
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="flex items-center gap-2">
              <ListChecks size={15} className="text-ldg-ink/40 shrink-0" />
              <span className="text-[13px] text-ldg-ink/70">
                <span className="font-mono font-semibold text-ldg-ink">{summary.habitsDone}/{summary.habitsTotal}</span> habits
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Droplet size={15} className="text-ldg-ink/40 shrink-0" />
              <span className="text-[13px] text-ldg-ink/70">
                <span className="font-mono font-semibold text-ldg-ink">{summary.waterMl.toLocaleString()}</span> ml water
              </span>
            </div>
            <div className="flex items-center gap-2">
              <UtensilsCrossed size={15} className="text-ldg-ink/40 shrink-0" />
              <span className="text-[13px] text-ldg-ink/70">
                <span className="font-mono font-semibold text-ldg-ink">{summary.mealsLogged}</span> meals logged
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Dumbbell size={15} className="text-ldg-ink/40 shrink-0" />
              <span className="text-[13px] text-ldg-ink/70">
                <span className="font-mono font-semibold text-ldg-ink">{summary.workoutsLogged}</span> workouts
              </span>
            </div>
            <div className="flex items-center gap-2">
              <ListChecks size={15} className="text-ldg-ink/40 shrink-0" />
              <span className="text-[13px] text-ldg-ink/70">
                <span className="font-mono font-semibold text-ldg-ink">{summary.tasksDone}/{summary.tasksTotal}</span> tasks
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Receipt size={15} className="text-ldg-ink/40 shrink-0" />
              <span className="text-[13px] text-ldg-ink/70">
                <span className="font-mono font-semibold text-ldg-ink">{summary.expensesLogged}</span> expenses
              </span>
            </div>
          </div>
        ) : (
          <div className="h-16 flex items-center text-ldg-ink/40 animate-pulse mt-3">Loading…</div>
        )}
      </Card>

      <Card className="p-5">
        <Label>How was today?</Label>
        <div className="flex gap-2 mt-3">
          {MOODS.map(m => (
            <button key={m} onClick={() => saveMood(m)}
              className={cn('flex-1 aspect-square rounded-xl text-2xl flex items-center justify-center transition-all border',
                log?.mood === m ? 'bg-ldg-green/10 border-ldg-green/30 scale-105' : 'border-ldg-ink/10 hover:bg-ldg-ink/[0.04]')}>
              {m}
            </button>
          ))}
        </div>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          onBlur={saveNotes}
          placeholder="Anything worth remembering about today…"
          rows={3}
          className="w-full mt-4 text-sm bg-ldg-paper rounded-lg px-3 py-2.5 outline-none border border-ldg-ink/10 resize-none leading-relaxed"
        />
        {saving && <p className="text-[11px] text-ldg-ink/40 mt-1">Saving…</p>}
      </Card>

      {history.length > 0 && (
        <Card className="overflow-hidden">
          <div className="px-5 py-3.5 border-b border-ldg-ink/[0.07]">
            <Label>Recent days</Label>
          </div>
          <div className="px-5">
            {history.map(e => (
              <div key={e.id} className="flex items-start gap-3 py-2.5 border-t border-ldg-ink/[0.07] first:border-t-0">
                <span className="text-xl shrink-0">{e.mood ?? '—'}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-[11px] text-ldg-ink/55">
                    {new Date(e.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </p>
                  {e.notes && <p className="text-[13px] text-ldg-ink mt-0.5 leading-snug">{e.notes}</p>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
