'use client'
import { useCallback, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Mascot, MascotMood } from './Mascot'
import { Check, Clock, X, Send } from 'lucide-react'

const MOODS = ['😞', '😕', '😐', '🙂', '😄']

interface Nudge {
  id: string; module: string; score: number; message: string; href: string
  habits?: { id: string; name: string }[]
  meals?: { mealType: string; plannedName: string }[]
  action?: 'no-expenses'
  moodPick?: boolean
}

// One parsed action from the "tell me anything" command box. Shape matches
// what POST /api/blob/command returns per array item.
type CommandAction =
  | { type: 'expense'; expenseType: 'personal' | 'business'; amount: number; currency: string; merchant: string | null; category: string | null; description: string | null; accountId: string | null; accountName: string | null }
  | { type: 'meal'; mealType: string; description: string }
  | { type: 'water'; volumeMl: number }
  | { type: 'habit'; habitId: string; habitName: string }
  | { type: 'task'; text: string }
  | { type: 'weight'; value: number }
  | { type: 'mood'; mood: string; notes: string | null }
  | { type: 'unclear'; originalText: string; reason: string }

function describeAction(a: CommandAction): string {
  switch (a.type) {
    case 'expense': return `${a.amount.toLocaleString()} ${a.currency} · ${a.merchant || a.category || 'expense'}${a.category ? ` (${a.category})` : ''}`
    case 'meal': return `${a.mealType} — ${a.description}`
    case 'water': return `${a.volumeMl}ml water`
    case 'habit': return `✓ ${a.habitName}`
    case 'task': return `Task: ${a.text}`
    case 'weight': return `Weight: ${a.value}`
    case 'mood': return `Mood ${a.mood}${a.notes ? ` — ${a.notes}` : ''}`
    case 'unclear': return `Not sure: "${a.originalText}"`
  }
}

function moduleForPath(path: string): string {
  if (path === '/') return 'home'
  const seg = path.split('/')[1]
  return seg === 'books' ? 'watchlist' : seg
}

function todayStr() {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
}

// Snooze = quiet for 2h; dismiss = quiet for the rest of the day. Both are
// how a companion earns trust: it takes "not now" for an answer instead of
// re-asking on every page load forever.
function isMuted(id: string): boolean {
  try {
    const snooze = localStorage.getItem(`nudge-snooze:${id}`)
    if (snooze && parseInt(snooze) > Date.now()) return true
    if (localStorage.getItem(`nudge-dismiss:${id}`) === todayStr()) return true
  } catch { /* private mode etc. */ }
  return false
}

/** Persistent companion — one per screen; can now DO things, not just point. */
export function FloatingMascot() {
  const [nudges, setNudges] = useState<Nudge[] | null>(null)
  const [celebration, setCelebration] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [justDone, setJustDone] = useState<Set<string>>(new Set())
  const [mealOpen, setMealOpen] = useState<string | null>(null)
  const [mealText, setMealText] = useState('')
  const [moodPicked, setMoodPicked] = useState<string | null>(null)
  const [, setTick] = useState(0) // re-render after snooze/dismiss (localStorage isn't reactive)
  const [commandText, setCommandText] = useState('')
  const [commandLoading, setCommandLoading] = useState(false)
  const [commandActions, setCommandActions] = useState<CommandAction[] | null>(null)
  const [commandSaved, setCommandSaved] = useState<Set<number>>(new Set())
  const pathname = usePathname()

  const loadNudges = useCallback(() => {
    const n = new Date()
    const p = new URLSearchParams({ h: String(n.getHours()), date: todayStr() })
    fetch(`/api/life/nudges?${p}`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : { nudges: [], celebration: null })
      .then(d => { setNudges(d.nudges ?? []); setCelebration(d.celebration ?? null) })
      .catch(() => { setNudges([]); setCelebration(null) })
  }, [])

  useEffect(() => { loadNudges() }, [loadNudges])

  if (nudges === null) return null

  const currentModule = moduleForPath(pathname)
  const visible = nudges.filter(n => !isMuted(n.id))
  // Home (the overview) surfaces the highest-priority nudge from anywhere;
  // a module page only speaks about its own module
  const top = currentModule === 'home' ? visible[0] : visible.find(n => n.module === currentModule)
  const mood: MascotMood = top ? 'curious' : 'pleased'

  async function checkHabit(habitId: string) {
    setJustDone(prev => new Set(prev).add(habitId))
    try {
      const res = await fetch('/api/life/logs', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ habitId, date: todayStr() + 'T12:00:00.000Z', completed: true }),
      })
      if (!res.ok) throw new Error()
      setTimeout(loadNudges, 800)
    } catch {
      toast.error("Couldn't save that — try again")
      setJustDone(prev => { const n = new Set(prev); n.delete(habitId); return n })
    }
  }

  async function logMeal(mealType: string, description: string | null) {
    setMealOpen(null)
    setMealText('')
    try {
      const res = await fetch('/api/life/meal-log', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: todayStr(), mealType, description }),
      })
      if (!res.ok) throw new Error()
      loadNudges()
    } catch {
      toast.error("Couldn't save that — try again")
    }
  }

  async function pickMood(mood: string) {
    setMoodPicked(mood)
    try {
      const res = await fetch('/api/life/day-log', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: todayStr(), mood }),
      })
      if (!res.ok) throw new Error()
      setTimeout(loadNudges, 800)
    } catch {
      toast.error("Couldn't save that — try again")
      setMoodPicked(null)
    }
  }

  async function noExpenses() {
    try {
      const res = await fetch('/api/life/catch-up', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: todayStr(), action: 'no-expenses' }),
      })
      if (!res.ok) throw new Error()
      loadNudges()
    } catch {
      toast.error("Couldn't save that — try again")
    }
  }

  async function submitCommand() {
    if (!commandText.trim() || commandLoading) return
    setCommandLoading(true)
    setCommandActions(null)
    setCommandSaved(new Set())
    try {
      const n = new Date()
      const res = await fetch('/api/blob/command', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: commandText.trim(), date: todayStr(), hour: n.getHours() }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setCommandActions(data.actions ?? [])
    } catch {
      toast.error("Couldn't parse that — try again")
    } finally {
      setCommandLoading(false)
    }
  }

  async function saveCommandAction(a: CommandAction, idx: number) {
    try {
      let res: Response
      switch (a.type) {
        case 'expense':
          res = await fetch('/api/finance/expenses', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              date: new Date().toISOString(), type: a.expenseType,
              category: a.category || 'Other', description: a.description || a.merchant || null,
              amount: a.amount, currency: a.currency, accountId: a.accountId,
              merchantName: a.merchant || null,
            }),
          })
          break
        case 'meal':
          res = await fetch('/api/life/meal-log', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date: todayStr(), mealType: a.mealType, description: a.description }),
          })
          break
        case 'water':
          res = await fetch('/api/life/water', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date: todayStr(), volumeMl: a.volumeMl }),
          })
          break
        case 'habit':
          res = await fetch('/api/life/logs', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ habitId: a.habitId, date: todayStr() + 'T12:00:00.000Z', completed: true }),
          })
          break
        case 'task':
          res = await fetch('/api/life/tasks', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date: todayStr(), text: a.text }),
          })
          break
        case 'weight':
          res = await fetch('/api/life/body-metrics', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ metric: 'weight', value: a.value, date: todayStr() }),
          })
          break
        case 'mood':
          res = await fetch('/api/life/day-log', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date: todayStr(), mood: a.mood, notes: a.notes }),
          })
          break
        default:
          return
      }
      if (!res.ok) throw new Error()
      setCommandSaved(prev => new Set(prev).add(idx))
      loadNudges()
    } catch {
      toast.error("Couldn't save that — try again")
    }
  }

  function snooze(id: string) {
    try { localStorage.setItem(`nudge-snooze:${id}`, String(Date.now() + 2 * 60 * 60 * 1000)) } catch {}
    setTick(t => t + 1)
  }
  function dismissToday(id: string) {
    try { localStorage.setItem(`nudge-dismiss:${id}`, todayStr()) } catch {}
    setTick(t => t + 1)
  }

  const pendingHabits = top?.habits?.filter(h => !justDone.has(h.id)) ?? []

  return (
    <div className="fixed z-40 bottom-24 right-4 md:bottom-6 md:right-6">
      {open && (
        <div className="absolute bottom-full right-0 mb-3 w-72 bg-surface/95 backdrop-blur-xl rounded-2xl border border-black/5 dark:border-white/5 shadow-lg p-4 page-in">
          {/* Universal quick-log box — tell it anything, it figures out where it goes */}
          <div className="flex gap-1.5">
            <input
              value={commandText}
              onChange={e => setCommandText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') submitCommand() }}
              placeholder="Tell me anything…"
              disabled={commandLoading}
              className="flex-1 min-w-0 bg-canvas-alt rounded-lg px-2.5 py-1.5 text-xs text-ink placeholder:text-ink/30 focus:outline-none disabled:opacity-60" />
            <button onClick={submitCommand} disabled={commandLoading || !commandText.trim()}
              className="flex items-center justify-center w-7 h-7 shrink-0 rounded-lg bg-[rgb(var(--l-green))] text-white disabled:opacity-40">
              {commandLoading ? <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Send size={12} />}
            </button>
          </div>

          {commandActions && (
            <div className="mt-2 space-y-1.5">
              {commandActions.length === 0 && (
                <p className="text-[11px] text-ink/40">Didn't catch anything there.</p>
              )}
              {commandActions.map((a, i) => {
                const saved = commandSaved.has(i)
                const canSave = a.type !== 'unclear' && !(a.type === 'expense' && !a.accountId)
                return (
                  <div key={i} className={cn('flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px]',
                    a.type === 'unclear' ? 'bg-ink/[0.04] text-ink/45' : saved ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-canvas-alt text-ink/80')}>
                    <span className="flex-1 min-w-0 truncate">{describeAction(a)}</span>
                    {saved ? (
                      <Check size={12} className="shrink-0 text-emerald-500" />
                    ) : canSave ? (
                      <button onClick={() => saveCommandAction(a, i)}
                        className="text-[10px] font-bold text-[rgb(var(--l-green))] shrink-0">Save</button>
                    ) : null}
                  </div>
                )
              })}
            </div>
          )}

          <div className="border-t border-black/5 dark:border-white/5 my-2.5" />

          {top ? (
            <>
              <p className="text-sm font-semibold text-ink leading-snug">{top.message}</p>

              {/* Inline habit checklist — act here, not on another page */}
              {top.habits && pendingHabits.length > 0 && (
                <div className="mt-2.5 space-y-1">
                  {top.habits.map(h => {
                    const done = justDone.has(h.id)
                    return (
                      <button key={h.id} onClick={() => !done && checkHabit(h.id)}
                        className={cn('flex items-center gap-2 w-full text-left px-2.5 py-1.5 rounded-lg transition-all duration-500',
                          done ? 'bg-emerald-500/10' : 'bg-canvas-alt hover:bg-canvas-alt/70 group')}>
                        <span className={cn('w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-all',
                          done ? 'bg-emerald-500 border-emerald-500' : 'border-ink/20 group-hover:border-[rgb(var(--coral))]')}>
                          {done && <Check size={10} className="text-white" strokeWidth={3.5} />}
                        </span>
                        <span className={cn('text-xs', done ? 'text-ink/35 line-through' : 'text-ink/80')}>{h.name}</span>
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Inline meal logging */}
              {top.meals && top.meals.length > 0 && (
                <div className="mt-2.5 space-y-1.5">
                  {top.meals.map(m => (
                    <div key={m.mealType}>
                      {mealOpen === m.mealType ? (
                        <div className="flex gap-1.5">
                          <input autoFocus value={mealText} onChange={e => setMealText(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && mealText.trim()) logMeal(m.mealType, mealText.trim()) }}
                            placeholder={`What was ${m.mealType}?`}
                            className="flex-1 min-w-0 bg-canvas-alt rounded-lg px-2.5 py-1.5 text-xs text-ink placeholder:text-ink/30 focus:outline-none" />
                          <button onClick={() => mealText.trim() && logMeal(m.mealType, mealText.trim())}
                            className="text-[10px] font-bold text-white bg-[rgb(var(--l-green))] px-2.5 rounded-lg shrink-0">Log</button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-ink/70 capitalize flex-1 truncate">{m.mealType} — {m.plannedName}</span>
                          <button onClick={() => { setMealOpen(m.mealType); setMealText('') }}
                            className="text-[10px] font-bold text-[rgb(var(--l-green))] shrink-0">Log</button>
                          <button onClick={() => logMeal(m.mealType, null)}
                            className="text-[10px] font-medium text-ink/35 shrink-0">Skipped</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Inline mood tap (evening review) */}
              {top.moodPick && (
                <div className="mt-2.5">
                  <div className="flex gap-1.5">
                    {MOODS.map(m => (
                      <button key={m} onClick={() => !moodPicked && pickMood(m)}
                        className={cn('flex-1 aspect-square rounded-lg text-lg flex items-center justify-center transition-all border',
                          moodPicked === m ? 'bg-emerald-500/10 border-emerald-500/40 scale-105' : 'border-black/5 dark:border-white/10 hover:bg-canvas-alt')}>
                        {m}
                      </button>
                    ))}
                  </div>
                  <Link href="/life/day-log" onClick={() => setOpen(false)}
                    className="text-[11px] font-bold text-[rgb(var(--l-green))] hover:underline mt-2 inline-block">
                    Add a note too →
                  </Link>
                </div>
              )}

              {/* Inline no-expenses answer */}
              {top.action === 'no-expenses' && (
                <div className="flex gap-2 mt-2.5">
                  <Link href="/finance/expenses/personal" onClick={() => setOpen(false)}
                    className="text-[11px] font-bold text-white bg-[rgb(var(--l-green))] px-3 py-1.5 rounded-full">Add expense</Link>
                  <button onClick={noExpenses}
                    className="text-[11px] font-medium text-ink/45 hover:text-ink/70 px-1.5">No spending today</button>
                </div>
              )}

              {/* Link fallback for nudges without inline actions */}
              {!top.habits && !top.meals && !top.action && !top.moodPick && (
                <Link href={top.href} onClick={() => setOpen(false)}
                  className="text-xs font-bold text-[rgb(var(--coral))] hover:underline mt-1.5 inline-block">
                  Take care of it →
                </Link>
              )}

              <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-black/5 dark:border-white/5">
                <div className="flex gap-3">
                  <button onClick={() => snooze(top.id)} className="flex items-center gap-1 text-[10px] font-medium text-ink/35 hover:text-ink/60">
                    <Clock size={10} /> Later
                  </button>
                  <button onClick={() => dismissToday(top.id)} className="flex items-center gap-1 text-[10px] font-medium text-ink/35 hover:text-ink/60">
                    <X size={10} /> Not today
                  </button>
                </div>
                {visible.length > 1 && (
                  <span className="text-[10px] text-ink/25">+{visible.length - 1} more</span>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm font-semibold text-ink leading-snug">
              {celebration ?? 'All caught up — nothing needs you right now.'}
            </p>
          )}
        </div>
      )}
      <button onClick={() => setOpen(o => { if (!o) loadNudges(); return !o })} aria-label="Companion"
        className="relative flex items-center justify-center w-14 h-14 rounded-full active:scale-95 transition-transform">
        <Mascot mood={mood} size={40} idle={!open} />
        {top && !open && (
          <span className="absolute top-0.5 right-0.5 w-3 h-3 rounded-full bg-[rgb(var(--coral))] border-2 border-canvas" />
        )}
      </button>
    </div>
  )
}
