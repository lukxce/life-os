'use client'
import Link from 'next/link'
import { useState } from 'react'
import { cn, formatEUR, formatRSD } from '@/lib/utils'
import { Mascot } from '@/components/ui/Mascot'
import { useHomeData, toLocalDateStr } from '../useHomeData'
import {
  Flame, Check, X, CalendarDays, Droplets, Receipt, Utensils, Sparkles,
  ChevronRight, Camera, Wallet,
} from 'lucide-react'

// ── NOVA — design-lab prototype A+B ───────────────────────────────────────────
// Dark-native, glow-as-physics, oversized gamified numerals. Same data and
// interactions as production Home; only the language changes. Compare against
// /design/ledger before committing either across the app.

const SAGE = '38 189 116'
const CORAL = '255 122 89'
const AMBER = '240 173 92'

function glowStyle(rgb: string, strength = 0.35) {
  return { boxShadow: `0 0 24px 2px rgb(${rgb} / ${strength})` }
}

function greeting(h: number) {
  if (h < 5) return 'Still up?'
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  if (h < 22) return 'Good evening'
  return 'Late one'
}

export default function NovaPrototype() {
  const d = useHomeData()
  const [newTask, setNewTask] = useState('')
  const [mealText, setMealText] = useState('')
  const [mealOpen, setMealOpen] = useState<string | null>(null)
  const now = new Date()
  const hour = now.getHours()
  const today = toLocalDateStr(now)

  const habitList = d.rightNow?.top?.habits?.filter(h => !d.justDone.has(h.id)) ?? []
  const hasTop = !!(d.rightNow?.top && d.rightNow.top.title?.trim())
  const pendingTasks = (d.todayTasks ?? []).filter(t => !t.completed && !d.taskJustDone.has(t.id))
  const pinned = (d.accounts ?? []).filter(a => a.pinned)
  const waterMl = (d.waterLogs ?? []).filter(w => w.drink === 'Water').reduce((a, w) => a + w.volumeMl, 0)
  const waterPct = Math.min(100, Math.round((waterMl / 3000) * 100))
  const openCatchHabits = (d.catchUp?.pendingHabits ?? []).filter(h => !d.catchDone.has(h.id))
  const showExpensesRow = !!d.catchUp && d.catchUp.expensesToday === 0 && !d.catchUp.noExpenses
  const catchCount = openCatchHabits.length + (d.catchUp?.unloggedMeals.length ?? 0) + (showExpensesRow ? 1 : 0)
  const todayScore = d.dayScores?.days.find(x => x.date === today)

  return (
    <div className="min-h-screen text-[#f2ede6]" style={{ background: 'radial-gradient(1200px 600px at 80% -10%, #221a14 0%, #16120f 55%)' }}>
      <div className="max-w-2xl mx-auto px-5 py-8 space-y-6 pb-24">

        {/* Header */}
        <header className="flex items-end justify-between">
          <div>
            <p className="text-[11px] font-bold tracking-[0.25em] uppercase text-white/30">
              {now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <h1 className="text-3xl font-black tracking-tight mt-1">{greeting(hour)}</h1>
          </div>
          <Link href="/" className="text-[11px] font-bold text-white/30 hover:text-white/60 uppercase tracking-widest">← current</Link>
        </header>

        {/* Hero: blob + right now, glow-first */}
        <div className="rounded-[2rem] p-6 bg-white/[0.045] border border-white/[0.07] backdrop-blur-xl">
          <div className="flex items-start gap-5">
            <div className="shrink-0" style={glowStyle(SAGE, 0.5)}>
              <div className="rounded-full">
                <Mascot mood={d.rightNow?.mood ?? 'content'} size={72} />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              {!d.rightNow ? (
                <div className="h-14 rounded-xl bg-white/5 animate-pulse" />
              ) : hasTop && (d.rightNow.top!.kind !== 'habit' || habitList.length > 0) ? (
                <>
                  <p className="text-[10px] font-bold uppercase tracking-[0.25em]" style={{ color: `rgb(${SAGE})` }}>Right now</p>
                  <p className="text-2xl font-black tracking-tight leading-tight mt-1">{d.rightNow.top!.title}</p>
                  <p className="text-sm text-white/40 mt-0.5">{d.rightNow.top!.detail}</p>

                  {d.rightNow.top!.kind === 'habit' && habitList.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {habitList.map(h => {
                        const done = d.justDone.has(h.id)
                        return (
                          <button key={h.id} onClick={() => !done && d.toggleHabit(h.id)}
                            className={cn('flex items-center gap-3 w-full text-left px-4 py-2.5 rounded-2xl transition-all duration-500 border',
                              done ? 'bg-emerald-400/10 border-emerald-400/30' : 'bg-white/[0.04] border-white/[0.06] hover:bg-white/[0.08]')}>
                            <span className={cn('w-6 h-6 rounded-full border-2 shrink-0 flex items-center justify-center transition-all',
                              done ? 'border-emerald-400 bg-emerald-400 scale-110' : 'border-white/20')}
                              style={done ? glowStyle('52 211 153', 0.5) : undefined}>
                              {done && <Check size={13} className="text-[#16120f]" strokeWidth={3.5} />}
                            </span>
                            <span className={cn('text-[15px] font-medium', done ? 'text-white/30 line-through' : 'text-white/85')}>{h.name}</span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                  {d.rightNow.top!.mealAsk && (
                    <div className="mt-4 flex gap-2">
                      <input value={mealText} onChange={e => setMealText(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && mealText.trim()) { d.logMeal(d.rightNow!.top!.mealAsk!.mealType, mealText.trim()); setMealText('') } }}
                        placeholder="What did you actually eat?"
                        className="flex-1 bg-white/[0.06] border border-white/[0.08] rounded-2xl px-4 py-2.5 text-sm placeholder:text-white/25 focus:outline-none focus:border-[rgb(38,189,116)]" />
                      <button onClick={() => { if (mealText.trim()) { d.logMeal(d.rightNow!.top!.mealAsk!.mealType, mealText.trim()); setMealText('') } }}
                        className="px-5 rounded-2xl font-bold text-sm text-[#16120f]" style={{ background: `rgb(${SAGE})`, ...glowStyle(SAGE, 0.4) }}>
                        Log
                      </button>
                    </div>
                  )}
                  {d.rightNow.top!.kind !== 'habit' && !d.rightNow.top!.mealAsk && (
                    <Link href={d.rightNow.top!.href} className="inline-flex items-center gap-1 text-xs font-bold mt-3 hover:underline" style={{ color: `rgb(${SAGE})` }}>
                      Take a look <ChevronRight size={12} />
                    </Link>
                  )}
                </>
              ) : (
                <>
                  <p className="text-[10px] font-bold uppercase tracking-[0.25em]" style={{ color: `rgb(${SAGE})` }}>Right now</p>
                  <p className="text-2xl font-black tracking-tight leading-tight mt-1">You&apos;re clear.</p>
                  <p className="text-sm text-white/40 mt-0.5">Nothing needs you this minute.</p>
                </>
              )}
            </div>
          </div>

          {d.rightNow && (
            <div className="mt-5 pt-4 border-t border-white/[0.06]">
              {d.rightNow.upcomingCalendar.length > 0 ? (
                <div className="flex gap-5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                  {d.rightNow.upcomingCalendar.map(item => (
                    <div key={item.id} className="shrink-0">
                      <p className="text-sm font-semibold text-white/80 truncate max-w-[160px]">{item.title}</p>
                      <p className="text-[11px] text-white/30">{item.detail}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-white/30 flex items-center gap-1.5">
                  <CalendarDays size={12} /> Nothing else on the calendar today.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Big numbers row — the gamified core */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-[1.75rem] p-5 bg-white/[0.045] border border-white/[0.07] text-center">
            <p className="text-5xl font-black tracking-tighter" style={{ color: `rgb(${AMBER})`, textShadow: `0 0 30px rgb(${AMBER} / 0.4)` }}>
              {todayScore ? todayScore.completed : '—'}
            </p>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35 mt-1">of {todayScore?.total ?? '—'} habits</p>
          </div>
          <div className="rounded-[1.75rem] p-5 bg-white/[0.045] border border-white/[0.07] text-center">
            <p className="text-5xl font-black tracking-tighter text-white/90">{pendingTasks.length}</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35 mt-1">tasks left</p>
          </div>
          <div className="rounded-[1.75rem] p-5 bg-white/[0.045] border border-white/[0.07] text-center">
            <p className="text-5xl font-black tracking-tighter" style={{ color: `rgb(${SAGE})`, textShadow: `0 0 30px rgb(${SAGE} / 0.4)` }}>
              {(waterMl / 1000).toFixed(1)}
            </p>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35 mt-1">L of 3L water</p>
          </div>
        </div>

        {/* Week rings */}
        {d.dayScores && (
          <div className="rounded-[2rem] p-5 bg-white/[0.045] border border-white/[0.07] flex items-center justify-between">
            <div className="flex items-center gap-3">
              {d.dayScores.days.map(day => {
                const isToday = day.date === today
                const pct = day.total > 0 ? Math.round((day.completed / day.total) * 100) : 0
                const label = new Date(day.date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'narrow' })
                const fill = isToday ? CORAL : AMBER
                return (
                  <div key={day.date} className="flex flex-col items-center gap-1.5">
                    <span className={cn('text-[10px] font-bold uppercase', isToday ? '' : 'text-white/25')} style={isToday ? { color: `rgb(${CORAL})` } : undefined}>{label}</span>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{
                        background: day.total > 0 ? `conic-gradient(rgb(${fill}) ${pct}%, rgb(255 255 255 / 0.07) 0)` : undefined,
                        ...(pct === 100 ? glowStyle(AMBER, 0.35) : {}),
                      }}>
                      <span className="w-[32px] h-[32px] rounded-full bg-[#1d1712] flex items-center justify-center text-[10px] font-bold">
                        {day.total === 0 ? '' : pct === 100 ? '🔥' : `${day.completed}/${day.total}`}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
            {d.dayScores.bestStreak.count >= 2 && (
              <div className="text-center shrink-0 pl-4">
                <p className="text-4xl font-black tracking-tighter flex items-center gap-1" style={{ color: `rgb(${AMBER})` }}>
                  <Flame size={28} style={{ filter: `drop-shadow(0 0 8px rgb(${AMBER} / 0.6))` }} />{d.dayScores.bestStreak.count}
                </p>
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/35 mt-0.5">day streak</p>
              </div>
            )}
          </div>
        )}

        {/* Catch up */}
        {d.catchUp && catchCount > 0 && (
          <div className="rounded-[2rem] p-6 border" style={{ background: `rgb(${CORAL} / 0.06)`, borderColor: `rgb(${CORAL} / 0.2)` }}>
            <h2 className="text-[10px] font-bold uppercase tracking-[0.25em] mb-4" style={{ color: `rgb(${CORAL})` }}>
              Catch up · {catchCount}
            </h2>
            <div className="space-y-3">
              {showExpensesRow && (
                <div className="flex items-center gap-3">
                  <Receipt size={16} className="text-white/30 shrink-0" />
                  <p className="text-sm text-white/80 flex-1">No expenses logged today</p>
                  <Link href="/finance/expenses/personal" className="text-xs font-bold px-4 py-2 rounded-full text-[#16120f]" style={{ background: `rgb(${CORAL})` }}>Add</Link>
                  <button onClick={d.markNoExpenses} className="text-xs font-medium text-white/35 hover:text-white/70">None today</button>
                </div>
              )}
              {d.catchUp.unloggedMeals.map(m => (
                <div key={m.mealType}>
                  {mealOpen === m.mealType ? (
                    <div className="flex gap-2">
                      <input autoFocus value={mealText} onChange={e => setMealText(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && mealText.trim()) { d.logMeal(m.mealType, mealText.trim()); setMealOpen(null); setMealText('') } }}
                        placeholder={`What was ${m.mealType}?`}
                        className="flex-1 bg-white/[0.06] border border-white/[0.08] rounded-2xl px-4 py-2 text-sm placeholder:text-white/25 focus:outline-none" />
                      <button onClick={() => { if (mealText.trim()) { d.logMeal(m.mealType, mealText.trim()); setMealOpen(null); setMealText('') } }}
                        className="px-4 rounded-2xl text-xs font-bold text-[#16120f]" style={{ background: `rgb(${AMBER})` }}>Log</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <Utensils size={16} className="text-white/30 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white/80 capitalize">{m.mealType} not logged</p>
                        <p className="text-xs text-white/30 truncate">{m.plannedName} was the plan</p>
                      </div>
                      <button onClick={() => { setMealOpen(m.mealType); setMealText('') }}
                        className="text-xs font-bold px-4 py-2 rounded-full text-[#16120f]" style={{ background: `rgb(${AMBER})` }}>Log</button>
                      <button onClick={() => d.logMeal(m.mealType, null)} className="text-xs font-medium text-white/35 hover:text-white/70">Skipped</button>
                    </div>
                  )}
                </div>
              ))}
              {openCatchHabits.slice(0, 5).map(h => {
                const done = d.catchDone.has(h.id)
                return (
                  <button key={h.id} onClick={() => !done && d.catchUpHabit(h.id)}
                    className="flex items-center gap-3 w-full text-left">
                    <Sparkles size={16} className="text-white/30 shrink-0" />
                    <span className={cn('text-sm flex-1', done ? 'text-white/25 line-through' : 'text-white/80')}>{h.name}</span>
                    <span className={cn('w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center',
                      done ? 'border-emerald-400 bg-emerald-400' : 'border-white/20')}>
                      {done && <Check size={11} className="text-[#16120f]" strokeWidth={3.5} />}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Tasks */}
        <div className="rounded-[2rem] p-6 bg-white/[0.045] border border-white/[0.07]">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/35 mb-4">Today&apos;s tasks</h2>
          <div className="space-y-2 mb-4">
            {pendingTasks.map(t => {
              const done = d.taskJustDone.has(t.id)
              return (
                <button key={t.id} onClick={() => !done && d.toggleTask(t.id)}
                  className={cn('flex items-center gap-3 w-full text-left px-4 py-3 rounded-2xl border transition-all duration-500',
                    done ? 'bg-emerald-400/10 border-emerald-400/30' :
                    t.priority ? 'border-transparent' : 'bg-white/[0.04] border-white/[0.06] hover:bg-white/[0.08]')}
                  style={t.priority && !done ? { background: `rgb(${CORAL} / 0.1)`, border: `1px solid rgb(${CORAL} / 0.3)` } : undefined}>
                  <span className={cn('w-6 h-6 rounded-full border-2 shrink-0 flex items-center justify-center transition-all',
                    done ? 'border-emerald-400 bg-emerald-400 scale-110' : 'border-white/20')}>
                    {done && <Check size={13} className="text-[#16120f]" strokeWidth={3.5} />}
                  </span>
                  <span className={cn('text-[15px] font-medium flex-1', done ? 'text-white/25 line-through' : 'text-white/85')}>{t.text}</span>
                  {t.priority && !done && <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full" style={{ background: `rgb(${CORAL} / 0.2)`, color: `rgb(${CORAL})` }}>priority</span>}
                </button>
              )
            })}
            {d.todayTasks && pendingTasks.length === 0 && <p className="text-sm text-white/25 italic">Nothing left today.</p>}
          </div>
          <div className="flex gap-2">
            <input value={newTask} onChange={e => setNewTask(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { d.addTask(d.todayStr, newTask); setNewTask('') } }}
              placeholder="Add a task…"
              className="flex-1 bg-white/[0.06] border border-white/[0.08] rounded-2xl px-4 py-2.5 text-sm placeholder:text-white/25 focus:outline-none focus:border-white/20" />
            <button onClick={() => { d.addTask(d.todayStr, newTask); setNewTask('') }}
              className="px-5 rounded-2xl font-bold text-sm text-[#16120f]" style={{ background: `rgb(${SAGE})`, ...glowStyle(SAGE, 0.3) }}>Add</button>
          </div>
        </div>

        {/* Water */}
        <div className="rounded-[2rem] p-6 bg-white/[0.045] border border-white/[0.07]">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/35 flex items-center gap-1.5"><Droplets size={12} /> Water</h2>
            <span className="text-sm font-bold text-white/60 tabular-nums">{(waterMl / 1000).toFixed(1)}L / 3L</span>
          </div>
          <div className="h-3 rounded-full bg-white/[0.06] overflow-hidden mb-4">
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${waterPct}%`, background: `rgb(${SAGE})`, boxShadow: `0 0 16px rgb(${SAGE} / 0.6)` }} />
          </div>
          <div className="flex gap-2">
            <button onClick={() => d.logWater('Water', 250)} className="px-4 py-2 rounded-full text-xs font-bold border border-white/[0.1] text-white/70 hover:bg-white/[0.06]">+250ml</button>
            <button onClick={() => d.logWater('Water', 500)} className="px-4 py-2 rounded-full text-xs font-bold border border-white/[0.1] text-white/70 hover:bg-white/[0.06]">+500ml</button>
          </div>
        </div>

        {/* Money */}
        {pinned.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {pinned.map(acc => (
              <Link key={acc.id} href="/finance" className="rounded-[1.75rem] p-5 bg-white/[0.045] border border-white/[0.07] hover:bg-white/[0.07] transition-colors">
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/30 truncate flex items-center gap-1"><Wallet size={10} /> {acc.name}</p>
                <p className="text-2xl font-black tracking-tight mt-1.5 tabular-nums">
                  {acc.currency === 'EUR' ? formatEUR(acc.currentBalance) : formatRSD(acc.currentBalance)}
                </p>
              </Link>
            ))}
          </div>
        )}

        {/* Agenda */}
        {(d.agenda?.length ?? 0) > 0 && (
          <div className="rounded-[2rem] bg-white/[0.045] border border-white/[0.07] overflow-hidden">
            <div className="px-6 py-3.5 border-b border-white/[0.06]">
              <h2 className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/35 flex items-center gap-1.5"><CalendarDays size={12} /> Today</h2>
            </div>
            {d.agenda!.map(item => (
              <div key={item.id} className="flex items-center gap-4 px-6 py-3 border-b border-white/[0.04] last:border-0">
                <span className="text-xs font-mono text-white/30 w-14 shrink-0 tabular-nums">{item.time}</span>
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: item.color, boxShadow: `0 0 8px ${item.color}` }} />
                <span className="text-sm text-white/80">{item.title}</span>
              </div>
            ))}
          </div>
        )}

        {/* Quick actions */}
        <div className="flex gap-3">
          <Link href="/finance/scan" className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-white/[0.1] text-sm font-bold text-white/70 hover:bg-white/[0.06]">
            <Camera size={15} /> Scan receipt
          </Link>
          <Link href="/finance/expenses/personal" className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-white/[0.1] text-sm font-bold text-white/70 hover:bg-white/[0.06]">
            <Receipt size={15} /> Add expense
          </Link>
        </div>

        <p className="text-center text-[10px] uppercase tracking-[0.3em] text-white/20 pt-4">
          Nova · design lab · <Link href="/design/ledger" className="underline hover:text-white/50">compare Ledger</Link>
        </p>
      </div>
    </div>
  )
}
