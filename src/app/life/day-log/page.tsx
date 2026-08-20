'use client'
import { useEffect, useState, useCallback } from 'react'
import { Card, Label } from '@/components/ledger/primitives'
import { cn } from '@/lib/utils'
import { Droplet, ListChecks, UtensilsCrossed, Dumbbell, Receipt, Plus, X, RefreshCw, ChevronDown } from 'lucide-react'

const MOODS = ['😞', '😕', '😐', '🙂', '😄']

// Quick-tap tags for the manual side of the journal-event layer — the
// auto-deduced side (from meal/note text) comes back tagged source:"auto"
// alongside the day's narrative, these are always source:"manual".
const QUICK_TAGS = [
  { type: 'alcohol', label: '🍷 Alcohol' },
  { type: 'vitamins', label: '💊 Vitamins' },
  { type: 'shared_bed', label: '🛏️ Shared bed' },
  { type: 'sugar', label: '🍰 Sugar' },
  { type: 'caffeine_late', label: '☕ Late caffeine' },
  { type: 'sick', label: '🤒 Felt sick' },
]

type Summary = {
  habitsDone: number; habitsTotal: number; habitNames: string[]
  waterMl: number; mealsLogged: number; mealsSkipped: number
  tasksDone: number; tasksTotal: number; expensesLogged: number; workoutsLogged: number
}
type LogEntry = { id: string; date: string; mood: string | null; notes: string | null; autoNarrative?: string | null }
type JournalEvent = { id: string; date: string; type: string; source: string; notes: string | null }

function toLocalISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function tagLabel(type: string) {
  return QUICK_TAGS.find(t => t.type === type)?.label ?? type
}

export default function DayLogPage() {
  const todayStr = toLocalISODate(new Date())
  const [summary, setSummary] = useState<Summary | null>(null)
  const [log, setLog] = useState<LogEntry | null>(null)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [history, setHistory] = useState<LogEntry[]>([])
  const [todayEvents, setTodayEvents] = useState<JournalEvent[]>([])
  const [customTag, setCustomTag] = useState('')
  const [expanded, setExpanded] = useState<Record<string, LogEntry | 'loading'>>({})

  const load = useCallback(async () => {
    const [todayRes, historyRes, eventsRes] = await Promise.all([
      fetch(`/api/life/day-log?date=${todayStr}`).then(r => r.json()),
      fetch('/api/life/day-log?limit=14').then(r => r.json()),
      fetch(`/api/life/journal-events?date=${todayStr}`).then(r => r.json()),
    ])
    setLog(todayRes.log)
    setSummary(todayRes.summary)
    setNotes(todayRes.log?.notes ?? '')
    setHistory(historyRes.filter((e: LogEntry) => e.date.slice(0, 10) !== todayStr))
    setTodayEvents(eventsRes)
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

  async function addTag(type: string, tagNotes?: string) {
    const event = await fetch('/api/life/journal-events', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: todayStr, type, notes: tagNotes ?? null }),
    }).then(r => r.json())
    setTodayEvents(prev => [...prev, event])
  }

  async function removeTag(id: string) {
    setTodayEvents(prev => prev.filter(e => e.id !== id))
    await fetch(`/api/life/journal-events?id=${id}`, { method: 'DELETE' })
  }

  async function toggleExpand(dateStr: string) {
    if (expanded[dateStr]) {
      setExpanded(prev => { const next = { ...prev }; delete next[dateStr]; return next })
      return
    }
    setExpanded(prev => ({ ...prev, [dateStr]: 'loading' }))
    const res = await fetch(`/api/life/day-log?date=${dateStr}`).then(r => r.json())
    setExpanded(prev => ({ ...prev, [dateStr]: res.log }))
  }

  async function regenerate(dateStr: string) {
    setExpanded(prev => ({ ...prev, [dateStr]: 'loading' }))
    await fetch('/api/life/day-log', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: dateStr, regenerate: true }),
    })
    const res = await fetch(`/api/life/day-log?date=${dateStr}`).then(r => r.json())
    setExpanded(prev => ({ ...prev, [dateStr]: res.log }))
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
        <Label>Tag today</Label>
        <div className="flex flex-wrap gap-2 mt-3">
          {todayEvents.map(e => (
            <button key={e.id} onClick={() => removeTag(e.id)}
              className={cn('flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1.5 rounded-full border transition-colors',
                e.source === 'auto' ? 'bg-ldg-ink/[0.04] border-ldg-ink/10 text-ldg-ink/60' : 'bg-ldg-green/10 border-ldg-green/20 text-ldg-green')}>
              {tagLabel(e.type)} <X size={11} />
            </button>
          ))}
          {QUICK_TAGS.filter(t => !todayEvents.some(e => e.type === t.type)).map(t => (
            <button key={t.type} onClick={() => addTag(t.type)}
              className="flex items-center gap-1 text-[12px] font-medium px-2.5 py-1.5 rounded-full border border-dashed border-ldg-ink/15 text-ldg-ink/50 hover:bg-ldg-ink/[0.04] transition-colors">
              <Plus size={11} /> {t.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 mt-3">
          <input value={customTag} onChange={e => setCustomTag(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && customTag.trim()) { addTag(customTag.trim()); setCustomTag('') } }}
            placeholder="+ custom (press Enter)"
            className="flex-1 text-sm bg-ldg-paper rounded-lg px-3 py-2 outline-none border border-ldg-ink/10" />
        </div>
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
            {history.map(e => {
              const dateStr = e.date.slice(0, 10)
              const isOpen = !!expanded[dateStr]
              const openLog = expanded[dateStr]
              return (
                <div key={e.id} className="border-t border-ldg-ink/[0.07] first:border-t-0">
                  <button onClick={() => toggleExpand(dateStr)} className="w-full flex items-start gap-3 py-2.5 text-left">
                    <span className="text-xl shrink-0">{e.mood ?? '—'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-[11px] text-ldg-ink/55">
                        {new Date(e.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </p>
                      {e.notes && <p className="text-[13px] text-ldg-ink mt-0.5 leading-snug">{e.notes}</p>}
                    </div>
                    <ChevronDown size={15} className={cn('text-ldg-ink/30 mt-1 transition-transform shrink-0', isOpen && 'rotate-180')} />
                  </button>
                  {isOpen && (
                    <div className="pb-3 pl-9">
                      {openLog === 'loading' ? (
                        <p className="text-[12px] text-ldg-ink/40 animate-pulse">Generating recap…</p>
                      ) : openLog?.autoNarrative ? (
                        <div className="bg-ldg-ink/[0.03] rounded-lg p-3">
                          <p className="text-[13px] text-ldg-ink/80 leading-relaxed">{openLog.autoNarrative}</p>
                          <button onClick={() => regenerate(dateStr)} className="flex items-center gap-1 text-[11px] text-ldg-ink/40 hover:text-ldg-ink/60 mt-2">
                            <RefreshCw size={10} /> Regenerate
                          </button>
                        </div>
                      ) : (
                        <p className="text-[12px] text-ldg-ink/40">No recap available for this day.</p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}
