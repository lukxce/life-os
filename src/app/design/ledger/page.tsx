'use client'
import Link from 'next/link'
import { useState } from 'react'
import { cn, formatEUR, formatRSD } from '@/lib/utils'
import { useHomeData, toLocalDateStr } from '../useHomeData'

// ── LEDGER — design-lab prototype C ───────────────────────────────────────────
// Editorial/Swiss: near-white paper, one ink, hairline rules instead of cards,
// tabular mono numerals, color used ONLY as data. Same real data and
// interactions as production Home. Compare against /design/nova.

const INK = '#1c1a17'
const PAPER = '#fcfbf8'
const RULE = 'rgba(28,26,23,0.14)'
const FAINT = 'rgba(28,26,23,0.45)'
const GOOD = '#2e7d4f'
const BAD = '#b0442e'

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-semibold uppercase" style={{ letterSpacing: '0.2em', color: FAINT }}>{children}</p>
}

function Rule() {
  return <div style={{ borderTop: `1px solid ${RULE}` }} />
}

function greeting(h: number) {
  if (h < 5) return 'Still up'
  if (h < 12) return 'Morning'
  if (h < 18) return 'Afternoon'
  if (h < 22) return 'Evening'
  return 'Late'
}

/** Minimal line-drawn companion — no fill, no glow, one stroke */
function InkBlob({ size = 28 }: { size?: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size}>
      <path d="M50 8C73 8 90 25 90 48C90 69 75 90 50 90C25 90 10 69 10 48C10 25 27 8 50 8Z"
        fill="none" stroke={INK} strokeWidth="4" />
      <circle cx="38" cy="46" r="4" fill={INK} />
      <circle cx="62" cy="46" r="4" fill={INK} />
      <path d="M40 62 Q50 68 60 62" stroke={INK} strokeWidth="4" strokeLinecap="round" fill="none" />
    </svg>
  )
}

export default function LedgerPrototype() {
  const d = useHomeData()
  const [newTask, setNewTask] = useState('')
  const [mealText, setMealText] = useState('')
  const [mealOpen, setMealOpen] = useState<string | null>(null)
  const now = new Date()
  const today = toLocalDateStr(now)

  const habitList = d.rightNow?.top?.habits?.filter(h => !d.justDone.has(h.id)) ?? []
  const hasTop = !!(d.rightNow?.top && d.rightNow.top.title?.trim())
  const pendingTasks = (d.todayTasks ?? []).filter(t => !t.completed && !d.taskJustDone.has(t.id))
  const pinned = (d.accounts ?? []).filter(a => a.pinned)
  const waterMl = (d.waterLogs ?? []).filter(w => w.drink === 'Water').reduce((a, w) => a + w.volumeMl, 0)
  const openCatchHabits = (d.catchUp?.pendingHabits ?? []).filter(h => !d.catchDone.has(h.id))
  const showExpensesRow = !!d.catchUp && d.catchUp.expensesToday === 0 && !d.catchUp.noExpenses
  const catchCount = openCatchHabits.length + (d.catchUp?.unloggedMeals.length ?? 0) + (showExpensesRow ? 1 : 0)
  const todayScore = d.dayScores?.days.find(x => x.date === today)

  return (
    <div className="min-h-screen" style={{ background: PAPER, color: INK }}>
      <div className="max-w-xl mx-auto px-6 py-12 pb-24 space-y-10">

        {/* Masthead */}
        <header>
          <div className="flex items-baseline justify-between">
            <h1 className="text-[2.6rem] leading-none font-light tracking-tight">{greeting(now.getHours())}.</h1>
            <Link href="/" className="text-[10px] font-semibold uppercase" style={{ letterSpacing: '0.2em', color: FAINT }}>← current</Link>
          </div>
          <p className="mt-2 font-mono text-xs" style={{ color: FAINT }}>
            {now.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
          <div className="mt-5" style={{ borderTop: `2px solid ${INK}` }} />
        </header>

        {/* Now */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <Label>Now</Label>
            <InkBlob />
          </div>
          {!d.rightNow ? (
            <p className="font-mono text-sm" style={{ color: FAINT }}>loading…</p>
          ) : hasTop && (d.rightNow.top!.kind !== 'habit' || habitList.length > 0) ? (
            <>
              <p className="text-xl font-medium leading-snug">{d.rightNow.top!.title}</p>
              <p className="font-mono text-xs mt-1" style={{ color: FAINT }}>{d.rightNow.top!.detail}</p>
              {d.rightNow.top!.kind === 'habit' && habitList.length > 0 && (
                <div className="mt-4">
                  {habitList.map(h => {
                    const done = d.justDone.has(h.id)
                    return (
                      <button key={h.id} onClick={() => !done && d.toggleHabit(h.id)}
                        className="flex items-center justify-between w-full text-left py-2.5 group"
                        style={{ borderTop: `1px solid ${RULE}` }}>
                        <span className={cn('text-sm', done && 'line-through')} style={{ color: done ? FAINT : INK }}>{h.name}</span>
                        <span className="font-mono text-xs" style={{ color: done ? GOOD : FAINT }}>
                          {done ? '✓ done' : '○ mark'}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
              {d.rightNow.top!.mealAsk && (
                <div className="mt-4 flex gap-3 items-baseline" style={{ borderTop: `1px solid ${RULE}`, paddingTop: 12 }}>
                  <input value={mealText} onChange={e => setMealText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && mealText.trim()) { d.logMeal(d.rightNow!.top!.mealAsk!.mealType, mealText.trim()); setMealText('') } }}
                    placeholder="What did you actually eat?"
                    className="flex-1 bg-transparent font-mono text-sm focus:outline-none placeholder:opacity-40"
                    style={{ borderBottom: `1px solid ${INK}`, paddingBottom: 4 }} />
                  <button onClick={() => { if (mealText.trim()) { d.logMeal(d.rightNow!.top!.mealAsk!.mealType, mealText.trim()); setMealText('') } }}
                    className="text-[10px] font-semibold uppercase" style={{ letterSpacing: '0.15em' }}>Log →</button>
                </div>
              )}
            </>
          ) : (
            <p className="text-xl font-medium">Clear. Nothing needs you.</p>
          )}
          {d.rightNow && d.rightNow.upcomingCalendar.length === 0 && (
            <p className="font-mono text-xs mt-3" style={{ color: FAINT }}>calendar — no further events today</p>
          )}
          {d.rightNow && d.rightNow.upcomingCalendar.length > 0 && (
            <div className="mt-3 space-y-1">
              {d.rightNow.upcomingCalendar.map(item => (
                <p key={item.id} className="font-mono text-xs" style={{ color: FAINT }}>{item.detail} — {item.title}</p>
              ))}
            </div>
          )}
        </section>

        <Rule />

        {/* The day in figures */}
        <section>
          <Label>The day in figures</Label>
          <div className="mt-3 grid grid-cols-3">
            <div>
              <p className="font-mono text-3xl tabular-nums tracking-tight">
                {todayScore ? `${todayScore.completed}/${todayScore.total}` : '—'}
              </p>
              <p className="text-[10px] uppercase mt-1" style={{ letterSpacing: '0.15em', color: FAINT }}>habits</p>
            </div>
            <div>
              <p className="font-mono text-3xl tabular-nums tracking-tight">{pendingTasks.length}</p>
              <p className="text-[10px] uppercase mt-1" style={{ letterSpacing: '0.15em', color: FAINT }}>tasks open</p>
            </div>
            <div>
              <p className="font-mono text-3xl tabular-nums tracking-tight">{(waterMl / 1000).toFixed(1)}<span className="text-base">/3L</span></p>
              <p className="text-[10px] uppercase mt-1" style={{ letterSpacing: '0.15em', color: FAINT }}>water</p>
            </div>
          </div>

          {/* Week as a table row */}
          {d.dayScores && (
            <div className="mt-6 grid grid-cols-7" style={{ borderTop: `1px solid ${RULE}` }}>
              {d.dayScores.days.map(day => {
                const isToday = day.date === today
                const pct = day.total > 0 ? Math.round((day.completed / day.total) * 100) : 0
                const label = new Date(day.date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'narrow' })
                return (
                  <div key={day.date} className="pt-2 pb-1 text-center" style={isToday ? { borderBottom: `2px solid ${INK}` } : undefined}>
                    <p className="text-[10px] font-semibold uppercase" style={{ color: isToday ? INK : FAINT }}>{label}</p>
                    <p className="font-mono text-xs tabular-nums mt-1" style={{ color: day.total === 0 ? RULE : pct === 100 ? GOOD : INK }}>
                      {day.total === 0 ? '·' : `${day.completed}/${day.total}`}
                    </p>
                    <div className="mx-2 mt-1.5 h-[3px]" style={{ background: RULE }}>
                      <div className="h-full" style={{ width: `${pct}%`, background: pct === 100 ? GOOD : INK }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          {d.dayScores && d.dayScores.bestStreak.count >= 2 && (
            <p className="font-mono text-xs mt-3" style={{ color: FAINT }}>
              longest current streak — {d.dayScores.bestStreak.name}, <span style={{ color: GOOD }}>{d.dayScores.bestStreak.count} days</span>
            </p>
          )}
        </section>

        <Rule />

        {/* Outstanding */}
        {d.catchUp && catchCount > 0 && (
          <>
            <section>
              <div className="flex items-baseline justify-between">
                <Label>Outstanding</Label>
                <span className="font-mono text-xs" style={{ color: BAD }}>{catchCount} item{catchCount === 1 ? '' : 's'}</span>
              </div>
              <div className="mt-2">
                {showExpensesRow && (
                  <div className="flex items-baseline justify-between py-2.5" style={{ borderTop: `1px solid ${RULE}` }}>
                    <span className="text-sm">Expenses — none recorded</span>
                    <span className="flex gap-4 font-mono text-xs">
                      <Link href="/finance/expenses/personal" className="underline underline-offset-2">add</Link>
                      <button onClick={d.markNoExpenses} style={{ color: FAINT }}>none today</button>
                    </span>
                  </div>
                )}
                {d.catchUp.unloggedMeals.map(m => (
                  <div key={m.mealType} className="py-2.5" style={{ borderTop: `1px solid ${RULE}` }}>
                    {mealOpen === m.mealType ? (
                      <div className="flex gap-3 items-baseline">
                        <input autoFocus value={mealText} onChange={e => setMealText(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter' && mealText.trim()) { d.logMeal(m.mealType, mealText.trim()); setMealOpen(null); setMealText('') } }}
                          placeholder={`what was ${m.mealType}?`}
                          className="flex-1 bg-transparent font-mono text-sm focus:outline-none placeholder:opacity-40"
                          style={{ borderBottom: `1px solid ${INK}`, paddingBottom: 4 }} />
                        <button onClick={() => { if (mealText.trim()) { d.logMeal(m.mealType, mealText.trim()); setMealOpen(null); setMealText('') } }}
                          className="text-[10px] font-semibold uppercase" style={{ letterSpacing: '0.15em' }}>Log →</button>
                      </div>
                    ) : (
                      <div className="flex items-baseline justify-between">
                        <span className="text-sm capitalize">{m.mealType} — unlogged <span className="font-mono text-xs" style={{ color: FAINT }}>({m.plannedName})</span></span>
                        <span className="flex gap-4 font-mono text-xs">
                          <button onClick={() => { setMealOpen(m.mealType); setMealText('') }} className="underline underline-offset-2">log</button>
                          <button onClick={() => d.logMeal(m.mealType, null)} style={{ color: FAINT }}>skipped</button>
                        </span>
                      </div>
                    )}
                  </div>
                ))}
                {openCatchHabits.slice(0, 6).map(h => {
                  const done = d.catchDone.has(h.id)
                  return (
                    <button key={h.id} onClick={() => !done && d.catchUpHabit(h.id)}
                      className="flex items-baseline justify-between w-full text-left py-2.5" style={{ borderTop: `1px solid ${RULE}` }}>
                      <span className={cn('text-sm', done && 'line-through')} style={{ color: done ? FAINT : INK }}>{h.name}</span>
                      <span className="font-mono text-xs" style={{ color: done ? GOOD : FAINT }}>{done ? '✓' : '○ mark'}</span>
                    </button>
                  )
                })}
              </div>
            </section>
            <Rule />
          </>
        )}

        {/* Tasks */}
        <section>
          <Label>Tasks</Label>
          <div className="mt-2">
            {pendingTasks.map(t => {
              const done = d.taskJustDone.has(t.id)
              return (
                <button key={t.id} onClick={() => !done && d.toggleTask(t.id)}
                  className="flex items-baseline justify-between w-full text-left py-2.5" style={{ borderTop: `1px solid ${RULE}` }}>
                  <span className={cn('text-sm', done && 'line-through')} style={{ color: done ? FAINT : INK }}>
                    {t.priority && <span className="font-mono text-xs mr-2" style={{ color: BAD }}>!</span>}{t.text}
                  </span>
                  <span className="font-mono text-xs" style={{ color: done ? GOOD : FAINT }}>{done ? '✓' : '○'}</span>
                </button>
              )
            })}
            {d.todayTasks && pendingTasks.length === 0 && (
              <p className="font-mono text-xs py-2.5" style={{ color: FAINT, borderTop: `1px solid ${RULE}` }}>nothing open</p>
            )}
            <div className="flex gap-3 items-baseline py-2.5" style={{ borderTop: `1px solid ${RULE}` }}>
              <input value={newTask} onChange={e => setNewTask(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { d.addTask(d.todayStr, newTask); setNewTask('') } }}
                placeholder="add a task"
                className="flex-1 bg-transparent font-mono text-sm focus:outline-none placeholder:opacity-40" />
              <button onClick={() => { d.addTask(d.todayStr, newTask); setNewTask('') }}
                className="text-[10px] font-semibold uppercase" style={{ letterSpacing: '0.15em' }}>Add →</button>
            </div>
          </div>
        </section>

        <Rule />

        {/* Water */}
        <section>
          <div className="flex items-baseline justify-between">
            <Label>Water</Label>
            <span className="font-mono text-xs tabular-nums">{waterMl} / 3000 ml</span>
          </div>
          <div className="mt-3 h-[3px]" style={{ background: RULE }}>
            <div className="h-full transition-all duration-500" style={{ width: `${Math.min(100, (waterMl / 3000) * 100)}%`, background: INK }} />
          </div>
          <div className="mt-3 flex gap-5 font-mono text-xs">
            <button onClick={() => d.logWater('Water', 250)} className="underline underline-offset-2">+250ml</button>
            <button onClick={() => d.logWater('Water', 500)} className="underline underline-offset-2">+500ml</button>
          </div>
        </section>

        <Rule />

        {/* Accounts */}
        {pinned.length > 0 && (
          <>
            <section>
              <Label>Accounts</Label>
              <div className="mt-2">
                {pinned.map(acc => (
                  <Link key={acc.id} href="/finance" className="flex items-baseline justify-between py-2.5 group" style={{ borderTop: `1px solid ${RULE}` }}>
                    <span className="text-sm group-hover:underline underline-offset-2">{acc.name}</span>
                    <span className="font-mono text-sm tabular-nums">
                      {acc.currency === 'EUR' ? formatEUR(acc.currentBalance) : formatRSD(acc.currentBalance)}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
            <Rule />
          </>
        )}

        {/* Agenda */}
        {(d.agenda?.length ?? 0) > 0 && (
          <section>
            <Label>Calendar</Label>
            <div className="mt-2">
              {d.agenda!.map(item => (
                <div key={item.id} className="flex items-baseline gap-5 py-2.5" style={{ borderTop: `1px solid ${RULE}` }}>
                  <span className="font-mono text-xs tabular-nums w-12 shrink-0" style={{ color: FAINT }}>{item.time}</span>
                  <span className="text-sm">{item.title}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <footer className="pt-6 text-center">
          <p className="font-mono text-[10px]" style={{ color: FAINT }}>
            Ledger · design lab · <Link href="/design/nova" className="underline underline-offset-2">compare Nova</Link>
          </p>
        </footer>
      </div>
    </div>
  )
}
