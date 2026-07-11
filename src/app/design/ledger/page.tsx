'use client'
import Link from 'next/link'
import { useState } from 'react'
import { cn, formatEUR, formatRSD } from '@/lib/utils'
import { Mascot } from '@/components/ui/Mascot'
import { useHomeData, toLocalDateStr } from '../useHomeData'
import { Check, Camera, Receipt, CalendarDays, Droplets, Flame, FileText, Plus, X } from 'lucide-react'

// ── LEDGER v3 — cool Proton-grade neutrals, app chrome, quick actions up top ──
// v2 feedback: still too close to the old warm-ivory design, actions buried
// at the bottom, no way to reach the rest of the app. v3 breaks the palette
// (cool paper, no coral), adds a sticky header with module navigation and a
// "+ New" quick-action menu. Green stays the single saturated voice.

const PAPER = '#f4f4f6'
const CARD = '#ffffff'
const INK = '#1b1b1e'
const BORDER = 'rgba(27,27,30,0.10)'
const RULE = 'rgba(27,27,30,0.07)'
const FAINT = 'rgba(27,27,30,0.55)'
const GREEN = '#2e7d4f'
const URGENT = '#c0442c'

const NAV = [
  { href: '/finance', label: 'Finance' },
  { href: '/life', label: 'Habits' },
  { href: '/fitness', label: 'Fitness' },
  { href: '/schedule', label: 'Schedule' },
  { href: '/journal', label: 'Journal' },
  { href: '/food', label: 'Food' },
  { href: '/personal', label: 'Personal' },
  { href: '/watchlist', label: 'Watchlist' },
]

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-semibold uppercase" style={{ letterSpacing: '0.14em', color: FAINT }}>{children}</p>
}

function Card({ children, className, accent }: { children: React.ReactNode; className?: string; accent?: string }) {
  return (
    <section className={cn('rounded-2xl', className)}
      style={{ background: CARD, border: `1px solid ${BORDER}`, borderLeft: accent ? `3px solid ${accent}` : `1px solid ${BORDER}`, boxShadow: '0 1px 2px rgba(27,27,30,0.04)' }}>
      {children}
    </section>
  )
}

function SolidBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className="text-[13px] font-semibold text-white px-3.5 py-1.5 rounded-lg shrink-0 active:scale-95 transition-transform"
      style={{ background: GREEN }}>
      {children}
    </button>
  )
}

function GhostBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className="text-[13px] font-medium px-3 py-1.5 rounded-lg shrink-0 hover:bg-black/[0.04] transition-colors"
      style={{ color: FAINT, border: `1px solid ${BORDER}` }}>
      {children}
    </button>
  )
}

function greeting(h: number) {
  if (h < 5) return 'Still up'
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  if (h < 22) return 'Good evening'
  return 'Late one'
}

export default function LedgerPrototype() {
  const d = useHomeData()
  const [newTask, setNewTask] = useState('')
  const [newTomorrow, setNewTomorrow] = useState('')
  const [mealText, setMealText] = useState('')
  const [mealOpen, setMealOpen] = useState<string | null>(null)
  const [newOpen, setNewOpen] = useState(false)
  const now = new Date()
  const today = toLocalDateStr(now)

  const habitList = d.rightNow?.top?.habits?.filter(h => !d.justDone.has(h.id)) ?? []
  const hasTop = !!(d.rightNow?.top && d.rightNow.top.title?.trim())
  const pendingTasks = (d.todayTasks ?? []).filter(t => !t.completed && !d.taskJustDone.has(t.id))
  const tomorrowList = d.tomorrowTasks ?? []
  const pinned = (d.accounts ?? []).filter(a => a.pinned)
  const waterMl = (d.waterLogs ?? []).filter(w => w.drink === 'Water').reduce((a, w) => a + w.volumeMl, 0)
  const openCatchHabits = (d.catchUp?.pendingHabits ?? []).filter(h => !d.catchDone.has(h.id))
  const showExpensesRow = !!d.catchUp && d.catchUp.expensesToday === 0 && !d.catchUp.noExpenses
  const catchCount = openCatchHabits.length + (d.catchUp?.unloggedMeals.length ?? 0) + (showExpensesRow ? 1 : 0)
  const todayScore = d.dayScores?.days.find(x => x.date === today)
  const billsToday = d.data?.finance.upcomingBills ?? []

  return (
    <div className="min-h-screen" style={{ background: PAPER, color: INK }}>

      {/* ── App chrome: sticky header with nav + quick actions ── */}
      <header className="sticky top-0 z-40" style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${BORDER}` }}>
        <div className="max-w-xl mx-auto px-5">
          <div className="flex items-center justify-between py-3">
            <p className="font-mono text-[12px] font-bold uppercase" style={{ letterSpacing: '0.2em' }}>Life OS</p>
            <div className="flex items-center gap-2">
              <Link href="/" className="text-[11px] font-semibold uppercase px-2" style={{ letterSpacing: '0.12em', color: FAINT }}>← current</Link>
              <div className="relative">
                <button onClick={() => setNewOpen(o => !o)}
                  className="flex items-center gap-1.5 text-[13px] font-semibold text-white pl-3 pr-3.5 py-1.5 rounded-lg active:scale-95 transition-transform"
                  style={{ background: newOpen ? INK : GREEN }}>
                  {newOpen ? <X size={14} /> : <Plus size={14} />} New
                </button>
                {newOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setNewOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 z-50 w-52 rounded-xl overflow-hidden"
                      style={{ background: CARD, border: `1px solid ${BORDER}`, boxShadow: '0 8px 24px rgba(27,27,30,0.12)' }}>
                      <Link href="/finance/scan" className="flex items-center gap-2.5 px-4 py-3 text-[14px] hover:bg-black/[0.03]" style={{ borderBottom: `1px solid ${RULE}` }}>
                        <Camera size={15} style={{ color: GREEN }} /> Scan receipt
                      </Link>
                      <Link href="/finance/expenses/personal" className="flex items-center gap-2.5 px-4 py-3 text-[14px] hover:bg-black/[0.03]" style={{ borderBottom: `1px solid ${RULE}` }}>
                        <Receipt size={15} style={{ color: GREEN }} /> Add expense
                      </Link>
                      <button onClick={() => { d.logWater('Water', 250); setNewOpen(false) }}
                        className="flex items-center gap-2.5 px-4 py-3 text-[14px] hover:bg-black/[0.03] w-full text-left" style={{ borderBottom: `1px solid ${RULE}` }}>
                        <Droplets size={15} style={{ color: GREEN }} /> Log 250ml water
                      </button>
                      <Link href="/schedule" className="flex items-center gap-2.5 px-4 py-3 text-[14px] hover:bg-black/[0.03]">
                        <CalendarDays size={15} style={{ color: GREEN }} /> My schedule
                      </Link>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          <nav className="flex gap-5 overflow-x-auto pb-2.5 -mt-0.5" style={{ scrollbarWidth: 'none' }}>
            {NAV.map(n => (
              <Link key={n.href} href={n.href}
                className="text-[13px] font-medium whitespace-nowrap hover:opacity-100 transition-opacity"
                style={{ color: FAINT }}>
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <div className="max-w-xl mx-auto px-5 py-6 pb-24 space-y-4">

        {/* Greeting */}
        <div className="px-1 pb-1">
          <h1 className="text-[1.6rem] font-bold tracking-tight">{greeting(now.getHours())}.</h1>
          <p className="font-mono text-[12px] mt-0.5" style={{ color: FAINT }}>
            {now.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Now — hero card with the green blob */}
        <Card className="p-5">
          <div className="flex items-start gap-4">
            <Mascot mood={d.rightNow?.mood ?? 'content'} size={52} className="shrink-0" />
            <div className="flex-1 min-w-0">
              <Label>Now</Label>
              {!d.rightNow ? (
                <div className="h-10 rounded-lg animate-pulse mt-1" style={{ background: RULE }} />
              ) : hasTop && (d.rightNow.top!.kind !== 'habit' || habitList.length > 0) ? (
                <>
                  <p className="text-[17px] font-semibold leading-snug mt-1">{d.rightNow.top!.title}</p>
                  <p className="font-mono text-[12px] mt-0.5" style={{ color: FAINT }}>{d.rightNow.top!.detail}</p>
                </>
              ) : (
                <p className="text-[17px] font-semibold leading-snug mt-1">Clear — nothing needs you this minute.</p>
              )}
            </div>
          </div>

          {hasTop && d.rightNow!.top!.kind === 'habit' && habitList.length > 0 && (
            <div className="mt-4">
              {habitList.map(h => {
                const done = d.justDone.has(h.id)
                return (
                  <button key={h.id} onClick={() => !done && d.toggleHabit(h.id)}
                    className="flex items-center gap-3 w-full text-left py-2.5 group"
                    style={{ borderTop: `1px solid ${RULE}` }}>
                    <span className="w-[18px] h-[18px] rounded-full border-2 shrink-0 flex items-center justify-center transition-all"
                      style={{ borderColor: done ? GREEN : 'rgba(27,27,30,0.25)', background: done ? GREEN : 'transparent' }}>
                      {done && <Check size={11} className="text-white" strokeWidth={3.5} />}
                    </span>
                    <span className={cn('text-[14px]', done && 'line-through')} style={{ color: done ? FAINT : INK }}>{h.name}</span>
                  </button>
                )
              })}
            </div>
          )}

          {hasTop && d.rightNow!.top!.mealAsk && (
            <div className="mt-4 flex gap-2">
              <input value={mealText} onChange={e => setMealText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && mealText.trim()) { d.logMeal(d.rightNow!.top!.mealAsk!.mealType, mealText.trim()); setMealText('') } }}
                placeholder="What did you actually eat?"
                className="flex-1 min-w-0 rounded-lg px-3 py-2 text-[14px] focus:outline-none"
                style={{ border: `1px solid ${BORDER}`, background: PAPER }} />
              <SolidBtn onClick={() => { if (mealText.trim()) { d.logMeal(d.rightNow!.top!.mealAsk!.mealType, mealText.trim()); setMealText('') } }}>Log</SolidBtn>
            </div>
          )}

          <div className="mt-4 pt-3" style={{ borderTop: `1px solid ${RULE}` }}>
            {d.rightNow && d.rightNow.upcomingCalendar.length > 0 ? (
              <div className="space-y-1">
                {d.rightNow.upcomingCalendar.map(item => (
                  <p key={item.id} className="font-mono text-[12px]" style={{ color: FAINT }}>{item.detail} — {item.title}</p>
                ))}
              </div>
            ) : (
              <p className="font-mono text-[12px]" style={{ color: FAINT }}>calendar · no further events today</p>
            )}
          </div>
        </Card>

        {/* The day in figures + the week */}
        <Card className="p-5">
          <Label>The day in figures</Label>
          <div className="mt-3 grid grid-cols-3">
            <div>
              <p className="font-mono text-[26px] tabular-nums tracking-tight leading-none">
                {todayScore ? <>{todayScore.completed}<span style={{ color: FAINT }}>/{todayScore.total}</span></> : '—'}
              </p>
              <p className="text-[11px] mt-1.5" style={{ color: FAINT }}>habits</p>
            </div>
            <div>
              <p className="font-mono text-[26px] tabular-nums tracking-tight leading-none">{pendingTasks.length}</p>
              <p className="text-[11px] mt-1.5" style={{ color: FAINT }}>tasks open</p>
            </div>
            <div>
              <p className="font-mono text-[26px] tabular-nums tracking-tight leading-none">
                {(waterMl / 1000).toFixed(1)}<span className="text-[15px]" style={{ color: FAINT }}>/3L</span>
              </p>
              <p className="text-[11px] mt-1.5" style={{ color: FAINT }}>water</p>
            </div>
          </div>

          {d.dayScores && (
            <div className="mt-5 grid grid-cols-7" style={{ borderTop: `1px solid ${RULE}` }}>
              {d.dayScores.days.map(day => {
                const isToday = day.date === today
                const pct = day.total > 0 ? Math.round((day.completed / day.total) * 100) : 0
                const label = new Date(day.date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'narrow' })
                return (
                  <div key={day.date} className="pt-2.5 pb-1.5 text-center rounded-b-lg" style={isToday ? { background: 'rgba(46,125,79,0.07)' } : undefined}>
                    <p className="text-[11px] font-bold uppercase" style={{ color: isToday ? GREEN : FAINT }}>{label}</p>
                    <p className="font-mono text-[13px] tabular-nums mt-1 font-semibold" style={{ color: day.total === 0 ? BORDER : pct === 100 ? GREEN : INK }}>
                      {day.total === 0 ? '·' : pct === 100 ? '✓' : `${day.completed}/${day.total}`}
                    </p>
                    <div className="mx-2.5 mt-1.5 h-[4px] rounded-full overflow-hidden" style={{ background: RULE }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct === 100 ? GREEN : INK }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          {d.dayScores && d.dayScores.bestStreak.count >= 2 && (
            <p className="font-mono text-[12px] mt-3 flex items-center gap-1.5" style={{ color: FAINT }}>
              <Flame size={13} style={{ color: GREEN }} />
              {d.dayScores.bestStreak.name} — <span style={{ color: GREEN, fontWeight: 600 }}>{d.dayScores.bestStreak.count} days</span>
            </p>
          )}
        </Card>

        {/* Outstanding */}
        {d.catchUp && catchCount > 0 && (
          <Card className="p-5" accent={URGENT}>
            <div className="flex items-baseline justify-between">
              <Label>Outstanding</Label>
              <span className="font-mono text-[12px] font-semibold" style={{ color: URGENT }}>{catchCount}</span>
            </div>
            <div className="mt-1">
              {showExpensesRow && (
                <div className="flex items-center gap-3 py-3" style={{ borderTop: `1px solid ${RULE}` }}>
                  <p className="text-[14px] flex-1">Expenses — none recorded today</p>
                  <Link href="/finance/expenses/personal"
                    className="text-[13px] font-semibold text-white px-3.5 py-1.5 rounded-lg shrink-0" style={{ background: GREEN }}>Add</Link>
                  <GhostBtn onClick={d.markNoExpenses}>None today</GhostBtn>
                </div>
              )}
              {d.catchUp.unloggedMeals.map(m => (
                <div key={m.mealType} className="py-3" style={{ borderTop: `1px solid ${RULE}` }}>
                  {mealOpen === m.mealType ? (
                    <div className="flex gap-2">
                      <input autoFocus value={mealText} onChange={e => setMealText(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && mealText.trim()) { d.logMeal(m.mealType, mealText.trim()); setMealOpen(null); setMealText('') } }}
                        placeholder={`What was ${m.mealType}?`}
                        className="flex-1 min-w-0 rounded-lg px-3 py-2 text-[14px] focus:outline-none"
                        style={{ border: `1px solid ${BORDER}`, background: PAPER }} />
                      <SolidBtn onClick={() => { if (mealText.trim()) { d.logMeal(m.mealType, mealText.trim()); setMealOpen(null); setMealText('') } }}>Log</SolidBtn>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] capitalize">{m.mealType} — unlogged</p>
                        <p className="font-mono text-[12px] truncate" style={{ color: FAINT }}>{m.plannedName}</p>
                      </div>
                      <SolidBtn onClick={() => { setMealOpen(m.mealType); setMealText('') }}>Log</SolidBtn>
                      <GhostBtn onClick={() => d.logMeal(m.mealType, null)}>Skipped</GhostBtn>
                    </div>
                  )}
                </div>
              ))}
              {openCatchHabits.slice(0, 6).map(h => {
                const done = d.catchDone.has(h.id)
                return (
                  <button key={h.id} onClick={() => !done && d.catchUpHabit(h.id)}
                    className="flex items-center gap-3 w-full text-left py-3" style={{ borderTop: `1px solid ${RULE}` }}>
                    <span className="w-[18px] h-[18px] rounded-full border-2 shrink-0 flex items-center justify-center transition-all"
                      style={{ borderColor: done ? GREEN : 'rgba(27,27,30,0.25)', background: done ? GREEN : 'transparent' }}>
                      {done && <Check size={11} className="text-white" strokeWidth={3.5} />}
                    </span>
                    <span className={cn('text-[14px] flex-1', done && 'line-through')} style={{ color: done ? FAINT : INK }}>{h.name}</span>
                  </button>
                )
              })}
            </div>
          </Card>
        )}

        {/* Bills due today */}
        {billsToday.length > 0 && (
          <Card className="p-5" accent={URGENT}>
            <Label>Due today</Label>
            <div className="mt-1">
              {billsToday.map(b => (
                <div key={b.id} className="flex items-baseline justify-between py-2.5" style={{ borderTop: `1px solid ${RULE}` }}>
                  <span className="text-[14px] flex items-center gap-2"><FileText size={13} style={{ color: FAINT }} /> {b.name}</span>
                  <span className="font-mono text-[14px] font-semibold tabular-nums">{b.amount.toLocaleString()} {b.currency}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Tasks — today + tomorrow */}
        <Card className="p-5">
          <div className="flex items-baseline justify-between">
            <Label>Tasks</Label>
            {d.taskStreak > 0 && (
              <span className="font-mono text-[12px] flex items-center gap-1" style={{ color: GREEN }}>
                <Flame size={12} /> {d.taskStreak} day{d.taskStreak === 1 ? '' : 's'}
              </span>
            )}
          </div>
          <div className="mt-1">
            {pendingTasks.map(t => {
              const done = d.taskJustDone.has(t.id)
              return (
                <button key={t.id} onClick={() => !done && d.toggleTask(t.id)}
                  className="flex items-center gap-3 w-full text-left py-2.5" style={{ borderTop: `1px solid ${RULE}` }}>
                  <span className="w-[18px] h-[18px] rounded-full border-2 shrink-0 flex items-center justify-center transition-all"
                    style={{ borderColor: done ? GREEN : t.priority ? URGENT : 'rgba(27,27,30,0.25)', background: done ? GREEN : 'transparent' }}>
                    {done && <Check size={11} className="text-white" strokeWidth={3.5} />}
                  </span>
                  <span className={cn('text-[14px] flex-1', done && 'line-through')} style={{ color: done ? FAINT : INK }}>{t.text}</span>
                  {t.priority && !done && (
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded" style={{ color: URGENT, background: 'rgba(192,68,44,0.08)', letterSpacing: '0.08em' }}>priority</span>
                  )}
                </button>
              )
            })}
            {d.todayTasks && pendingTasks.length === 0 && (
              <p className="font-mono text-[12px] py-2.5" style={{ color: FAINT, borderTop: `1px solid ${RULE}` }}>nothing open</p>
            )}
            <div className="flex gap-2 pt-3" style={{ borderTop: `1px solid ${RULE}` }}>
              <input value={newTask} onChange={e => setNewTask(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { d.addTask(d.todayStr, newTask); setNewTask('') } }}
                placeholder="Add a task for today"
                className="flex-1 min-w-0 rounded-lg px-3 py-2 text-[14px] focus:outline-none"
                style={{ border: `1px solid ${BORDER}`, background: PAPER }} />
              <SolidBtn onClick={() => { d.addTask(d.todayStr, newTask); setNewTask('') }}>Add</SolidBtn>
            </div>
          </div>

          <div className="mt-5">
            <div className="flex items-baseline justify-between">
              <Label>Tomorrow</Label>
              <span className="font-mono text-[12px]" style={{ color: FAINT }}>{tomorrowList.length} planned</span>
            </div>
            <div className="mt-1">
              {tomorrowList.map(t => (
                <div key={t.id} className="flex items-center gap-3 py-2.5" style={{ borderTop: `1px solid ${RULE}` }}>
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: t.priority ? URGENT : FAINT }} />
                  <span className="text-[14px] flex-1" style={{ color: INK }}>{t.text}</span>
                </div>
              ))}
              {tomorrowList.length === 0 && (
                <p className="font-mono text-[12px] py-2.5" style={{ color: FAINT, borderTop: `1px solid ${RULE}` }}>nothing planned yet</p>
              )}
              <div className="flex gap-2 pt-3" style={{ borderTop: `1px solid ${RULE}` }}>
                <input value={newTomorrow} onChange={e => setNewTomorrow(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { d.addTask(d.tomorrowStr, newTomorrow); setNewTomorrow('') } }}
                  placeholder="Plan something for tomorrow"
                  className="flex-1 min-w-0 rounded-lg px-3 py-2 text-[14px] focus:outline-none"
                  style={{ border: `1px solid ${BORDER}`, background: PAPER }} />
                <GhostBtn onClick={() => { d.addTask(d.tomorrowStr, newTomorrow); setNewTomorrow('') }}>Add</GhostBtn>
              </div>
            </div>
          </div>
        </Card>

        {/* Water */}
        <Card className="p-5">
          <div className="flex items-baseline justify-between">
            <Label>Water</Label>
            <span className="font-mono text-[13px] tabular-nums font-semibold">{(waterMl / 1000).toFixed(1)}L <span style={{ color: FAINT, fontWeight: 400 }}>/ 3L</span></span>
          </div>
          <div className="mt-3 h-[6px] rounded-full overflow-hidden" style={{ background: RULE }}>
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (waterMl / 3000) * 100)}%`, background: GREEN }} />
          </div>
          <div className="mt-3.5 flex gap-2">
            <GhostBtn onClick={() => d.logWater('Water', 250)}>+ 250ml</GhostBtn>
            <GhostBtn onClick={() => d.logWater('Water', 500)}>+ 500ml</GhostBtn>
          </div>
          <p className="font-mono text-[11px] mt-2.5 flex items-center gap-1" style={{ color: FAINT }}>
            <Droplets size={11} /> only water moves the bar
          </p>
        </Card>

        {/* Accounts */}
        {pinned.length > 0 && (
          <Card className="p-5">
            <Label>Accounts</Label>
            <div className="mt-1">
              {pinned.map(acc => (
                <Link key={acc.id} href="/finance" className="flex items-baseline justify-between py-3 group" style={{ borderTop: `1px solid ${RULE}` }}>
                  <span className="text-[14px] group-hover:underline underline-offset-2">{acc.name}</span>
                  <span className="font-mono text-[15px] font-semibold tabular-nums">
                    {acc.currency === 'EUR' ? formatEUR(acc.currentBalance) : formatRSD(acc.currentBalance)}
                  </span>
                </Link>
              ))}
            </div>
          </Card>
        )}

        {/* Calendar */}
        {(d.agenda?.length ?? 0) > 0 && (
          <Card className="p-5">
            <div className="flex items-baseline justify-between">
              <Label>Calendar</Label>
              <Link href="/schedule" className="font-mono text-[12px] underline underline-offset-2" style={{ color: FAINT }}>full schedule</Link>
            </div>
            <div className="mt-1">
              {d.agenda!.map(item => (
                <div key={item.id} className="flex items-baseline gap-4 py-2.5" style={{ borderTop: `1px solid ${RULE}` }}>
                  <span className="font-mono text-[12px] tabular-nums w-12 shrink-0" style={{ color: FAINT }}>{item.time}</span>
                  <span className="w-1.5 h-1.5 rounded-full shrink-0 self-center" style={{ background: item.color }} />
                  <span className="text-[14px]">{item.title}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        <footer className="pt-4 text-center">
          <p className="font-mono text-[11px]" style={{ color: FAINT }}>
            Ledger v3 · design lab · <Link href="/design/nova" className="underline underline-offset-2">compare Nova</Link>
          </p>
        </footer>
      </div>
    </div>
  )
}
