'use client'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useState } from 'react'
import { cn, formatEUR, formatRSD } from '@/lib/utils'
import { Mascot } from '@/components/ui/Mascot'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { AppHeader, AppHeaderSpacer } from '@/components/ledger/AppHeader'
import { QuickFab } from '@/components/ledger/QuickFab'
import { QuickAction } from '@/components/ledger/QuickMenu'
import { Card, Label, SolidBtn, GhostBtn } from '@/components/ledger/primitives'
import { useHomeData, toLocalDateStr } from '@/hooks/useHomeData'
import { useCommandBox, describeCommandAction } from '@/hooks/useCommandBox'
import {
  Check, ChevronDown, CalendarDays, Droplets, Flame, FileText,
  Camera, Receipt, Send,
} from 'lucide-react'

const FoodMapPreview = dynamic(
  () => import('@/components/food/FoodMapPreview').then(m => m.FoodMapPreview),
  { ssr: false, loading: () => <div className="h-64 bg-ldg-ink/[0.04] rounded-2xl animate-pulse" /> }
)

// Home has no ModuleConfig (it isn't a module), so its quick actions are
// defined locally — same shape as every module's own action list
const HOME_ACTIONS: QuickAction[] = [
  { label: 'Scan receipt', icon: Camera, href: '/finance/scan' },
  { label: 'Add expense', icon: Receipt, href: '/finance/expenses/personal' },
  { label: 'My schedule', icon: CalendarDays, href: '/schedule' },
]

function greeting(h: number) {
  if (h < 5) return 'Still up'
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  if (h < 22) return 'Good evening'
  return 'Late one'
}

export default function HomePage() {
  const d = useHomeData()
  const [newTask, setNewTask] = useState('')
  const [newTomorrow, setNewTomorrow] = useState('')
  const [mealText, setMealText] = useState('')
  const [mealOpen, setMealOpen] = useState<string | null>(null)
  const [outstandingOpen, setOutstandingOpen] = useState(false)
  const {
    commandText, setCommandText, commandLoading, commandActions, commandSaved,
    submitCommand, saveCommandAction,
  } = useCommandBox(d.refreshAll)
  const now = new Date()
  const today = toLocalDateStr(now)

  const habitList = d.rightNow?.top?.habits?.filter(h => !d.justDone.has(h.id)) ?? []
  const hasTop = !!(d.rightNow?.top && d.rightNow.top.title?.trim())
  const pendingTasks = (d.todayTasks ?? []).filter(t => !t.completed && !d.taskJustDone.has(t.id))
  const tomorrowList = d.tomorrowTasks ?? []
  const pinned = (d.accounts ?? []).filter(a => a.pinned)
  const waterMl = (d.waterLogs ?? []).filter(w => w.drink === 'Water').reduce((a, w) => a + w.volumeMl, 0)
  // Outstanding excludes whatever the Now hero is already showing
  const heroHabitIds = new Set((d.rightNow?.top?.habits ?? []).map(h => h.id))
  const openCatchHabits = (d.catchUp?.pendingHabits ?? []).filter(h => !d.catchDone.has(h.id) && !heroHabitIds.has(h.id))
  const showExpensesRow = !!d.catchUp && d.catchUp.expensesToday === 0 && !d.catchUp.noExpenses
  const catchCount = openCatchHabits.length + (d.catchUp?.unloggedMeals.length ?? 0) + (showExpensesRow ? 1 : 0)
  const outstandingSummary = [
    showExpensesRow && 'expenses',
    d.catchUp && d.catchUp.unloggedMeals.length > 0 && `${d.catchUp.unloggedMeals.length} meal${d.catchUp.unloggedMeals.length === 1 ? '' : 's'}`,
    openCatchHabits.length > 0 && `${openCatchHabits.length} habit${openCatchHabits.length === 1 ? '' : 's'}`,
  ].filter(Boolean).join(' · ')
  const todayScore = d.dayScores?.days.find(x => x.date === today)
  const billsToday = d.data?.finance.upcomingBills ?? []

  return (
    <div className="min-h-screen bg-ldg-paper text-ldg-ink">
      <AppHeader actions={HOME_ACTIONS} />
      <AppHeaderSpacer />

      <div className="max-w-xl mx-auto px-5 py-6 pb-28 space-y-4">

        {/* Greeting */}
        <div className="px-1 pb-1">
          <h1 className="text-[1.6rem] font-bold tracking-tight">{greeting(now.getHours())}.</h1>
          <p className="font-mono text-[12px] mt-0.5 text-ldg-ink/55">
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
                <div className="h-10 rounded-lg animate-pulse mt-1 bg-ldg-ink/[0.07]" />
              ) : hasTop && (d.rightNow.top!.kind !== 'habit' || habitList.length > 0) ? (
                <>
                  <p className="text-[17px] font-semibold leading-snug mt-1">{d.rightNow.top!.title}</p>
                  <p className="font-mono text-[12px] mt-0.5 text-ldg-ink/55">{d.rightNow.top!.detail}</p>
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
                    className="flex items-center gap-3 w-full text-left py-2.5 border-t border-ldg-ink/[0.07]">
                    <span className={cn('w-[18px] h-[18px] rounded-full border-2 shrink-0 flex items-center justify-center transition-all',
                      done ? 'border-ldg-green bg-ldg-green' : 'border-ldg-ink/25')}>
                      {done && <Check size={11} className="text-white" strokeWidth={3.5} />}
                    </span>
                    <span className={cn('text-[14px]', done ? 'text-ldg-ink/55 line-through' : 'text-ldg-ink')}>{h.name}</span>
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
                className="flex-1 min-w-0 rounded-lg px-3 py-2 text-[14px] bg-ldg-paper border border-ldg-ink/10 focus:outline-none" />
              <SolidBtn onClick={() => { if (mealText.trim()) { d.logMeal(d.rightNow!.top!.mealAsk!.mealType, mealText.trim()); setMealText('') } }}>Log</SolidBtn>
            </div>
          )}

          {/* Universal quick-log box — tell it anything, it figures out where it goes */}
          <div className="mt-4 pt-3 border-t border-ldg-ink/[0.07]">
            <div className="flex gap-2">
              <input value={commandText} onChange={e => setCommandText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') submitCommand() }}
                placeholder="Tell me anything…" disabled={commandLoading}
                className="flex-1 min-w-0 rounded-lg px-3 py-2 text-[14px] bg-ldg-paper border border-ldg-ink/10 focus:outline-none disabled:opacity-60" />
              <button onClick={submitCommand} disabled={commandLoading || !commandText.trim()}
                className="flex items-center justify-center w-9 h-9 shrink-0 rounded-lg bg-ldg-green text-white disabled:opacity-40">
                {commandLoading ? <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Send size={14} />}
              </button>
            </div>
            {commandActions && (
              <div className="mt-2 space-y-1.5">
                {commandActions.length === 0 && (
                  <p className="text-[12px] text-ldg-ink/40">Didn't catch anything there.</p>
                )}
                {commandActions.map((a, i) => {
                  const saved = commandSaved.has(i)
                  const canSave = a.type !== 'unclear' && !(a.type === 'expense' && !a.accountId)
                  return (
                    <div key={i} className={cn('flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[12px]',
                      a.type === 'unclear' ? 'bg-ldg-ink/[0.04] text-ldg-ink/45' : saved ? 'bg-ldg-green/10 text-ldg-green' : 'bg-ldg-ink/[0.04] text-ldg-ink/80')}>
                      <span className="flex-1 min-w-0 truncate">{describeCommandAction(a)}</span>
                      {saved ? (
                        <Check size={13} className="shrink-0 text-ldg-green" />
                      ) : canSave ? (
                        <button onClick={() => saveCommandAction(a, i)}
                          className="text-[11px] font-bold text-ldg-green shrink-0">Save</button>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-ldg-ink/[0.07]">
            {d.rightNow && d.rightNow.upcomingCalendar.length > 0 ? (
              <div className="space-y-1">
                {d.rightNow.upcomingCalendar.map(item => (
                  <p key={item.id} className="font-mono text-[12px] text-ldg-ink/55">{item.detail} — {item.title}</p>
                ))}
              </div>
            ) : (
              <p className="font-mono text-[12px] text-ldg-ink/55">calendar · no further events today</p>
            )}
          </div>
        </Card>

        {/* The day in figures + the week */}
        <Card className="p-5">
          <Label>The day in figures</Label>
          <div className="mt-3 grid grid-cols-3">
            <div>
              <p className="font-mono text-[26px] tabular-nums tracking-tight leading-none">
                {todayScore ? <>{todayScore.completed}<span className="text-ldg-ink/55">/{todayScore.total}</span></> : '—'}
              </p>
              <p className="text-[11px] mt-1.5 text-ldg-ink/55">habits</p>
            </div>
            <div>
              <p className="font-mono text-[26px] tabular-nums tracking-tight leading-none">{pendingTasks.length}</p>
              <p className="text-[11px] mt-1.5 text-ldg-ink/55">tasks open</p>
            </div>
            <div>
              <p className="font-mono text-[26px] tabular-nums tracking-tight leading-none">
                {(waterMl / 1000).toFixed(1)}<span className="text-[15px] text-ldg-ink/55">/3L</span>
              </p>
              <p className="text-[11px] mt-1.5 text-ldg-ink/55">water</p>
            </div>
          </div>

          {d.dayScores && (
            <div className="mt-5 grid grid-cols-7 border-t border-ldg-ink/[0.07]">
              {d.dayScores.days.map(day => {
                const isToday = day.date === today
                const pct = day.total > 0 ? Math.round((day.completed / day.total) * 100) : 0
                const label = new Date(day.date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'narrow' })
                return (
                  <div key={day.date} className={cn('pt-2.5 pb-1.5 text-center rounded-b-lg', isToday && 'bg-ldg-green/[0.07]')}>
                    <p className={cn('text-[11px] font-bold uppercase', isToday ? 'text-ldg-green' : 'text-ldg-ink/55')}>{label}</p>
                    <p className={cn('font-mono text-[13px] tabular-nums mt-1 font-semibold',
                      day.total === 0 ? 'text-ldg-ink/10' : pct === 100 ? 'text-ldg-green' : 'text-ldg-ink')}>
                      {day.total === 0 ? '·' : pct === 100 ? '✓' : `${day.completed}/${day.total}`}
                    </p>
                    <div className="mx-2.5 mt-1.5 h-[4px] rounded-full overflow-hidden bg-ldg-ink/[0.07]">
                      <div className={cn('h-full rounded-full', pct === 100 ? 'bg-ldg-green' : 'bg-ldg-ink')} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          {d.dayScores && d.dayScores.bestStreak.count >= 2 && (
            <p className="font-mono text-[12px] mt-3 flex items-center gap-1.5 text-ldg-ink/55">
              <Flame size={13} className="text-ldg-green" />
              {d.dayScores.bestStreak.name} — <span className="text-ldg-green font-semibold">{d.dayScores.bestStreak.count} days</span>
            </p>
          )}
        </Card>

        {/* Outstanding — collapsed by default, no red: it's pending, not wrong */}
        {d.catchUp && catchCount > 0 && (
          <Card className="p-5">
            <button onClick={() => setOutstandingOpen(o => !o)} className="flex items-center justify-between w-full text-left">
              <div className="flex items-baseline gap-2">
                <Label>Outstanding</Label>
                <span className="font-mono text-[12px] font-semibold text-ldg-ink/55">{catchCount}</span>
              </div>
              <ChevronDown size={15} className={cn('text-ldg-ink/55 transition-transform', outstandingOpen && 'rotate-180')} />
            </button>
            {!outstandingOpen && <p className="font-mono text-[12px] mt-1.5 text-ldg-ink/55">{outstandingSummary}</p>}
            <div className={cn('mt-1', !outstandingOpen && 'hidden')}>
              {showExpensesRow && (
                <div className="flex items-center gap-3 py-3 border-t border-ldg-ink/[0.07]">
                  <p className="text-[14px] flex-1">Expenses — none recorded today</p>
                  <Link href="/finance/expenses/personal" className="text-[13px] font-semibold text-white bg-ldg-green px-3.5 py-1.5 rounded-lg shrink-0">Add</Link>
                  <GhostBtn onClick={d.markNoExpenses}>None today</GhostBtn>
                </div>
              )}
              {d.catchUp.unloggedMeals.map(m => (
                <div key={m.mealType} className="py-3 border-t border-ldg-ink/[0.07]">
                  {mealOpen === m.mealType ? (
                    <div className="flex gap-2">
                      <input autoFocus value={mealText} onChange={e => setMealText(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && mealText.trim()) { d.logMeal(m.mealType, mealText.trim()); setMealOpen(null); setMealText('') } }}
                        placeholder={`What was ${m.mealType}?`}
                        className="flex-1 min-w-0 rounded-lg px-3 py-2 text-[14px] bg-ldg-paper border border-ldg-ink/10 focus:outline-none" />
                      <SolidBtn onClick={() => { if (mealText.trim()) { d.logMeal(m.mealType, mealText.trim()); setMealOpen(null); setMealText('') } }}>Log</SolidBtn>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] capitalize">{m.mealType} — unlogged</p>
                        <p className="font-mono text-[12px] truncate text-ldg-ink/55">{m.plannedName}</p>
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
                    className="flex items-center gap-3 w-full text-left py-3 border-t border-ldg-ink/[0.07]">
                    <span className={cn('w-[18px] h-[18px] rounded-full border-2 shrink-0 flex items-center justify-center transition-all',
                      done ? 'border-ldg-green bg-ldg-green' : 'border-ldg-ink/25')}>
                      {done && <Check size={11} className="text-white" strokeWidth={3.5} />}
                    </span>
                    <span className={cn('text-[14px] flex-1', done ? 'text-ldg-ink/55 line-through' : 'text-ldg-ink')}>{h.name}</span>
                  </button>
                )
              })}
            </div>
          </Card>
        )}

        {/* Bills due today — genuine money due, keeps the accent */}
        {billsToday.length > 0 && (
          <Card className="p-5" accent="urgent">
            <Label>Due today</Label>
            <div className="mt-1">
              {billsToday.map(b => (
                <div key={b.id} className="flex items-baseline justify-between py-2.5 border-t border-ldg-ink/[0.07]">
                  <span className="text-[14px] flex items-center gap-2"><FileText size={13} className="text-ldg-ink/55" /> {b.name}</span>
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
              <span className="font-mono text-[12px] flex items-center gap-1 text-ldg-green">
                <Flame size={12} /> {d.taskStreak} day{d.taskStreak === 1 ? '' : 's'}
              </span>
            )}
          </div>
          <div className="mt-1">
            {pendingTasks.map(t => {
              const done = d.taskJustDone.has(t.id)
              return (
                <button key={t.id} onClick={() => !done && d.toggleTask(t.id)}
                  className="flex items-center gap-3 w-full text-left py-2.5 border-t border-ldg-ink/[0.07]">
                  <span className={cn('w-[18px] h-[18px] rounded-full border-2 shrink-0 flex items-center justify-center transition-all',
                    done ? 'border-ldg-green bg-ldg-green' : t.priority ? 'border-ldg-urgent' : 'border-ldg-ink/25')}>
                    {done && <Check size={11} className="text-white" strokeWidth={3.5} />}
                  </span>
                  <span className={cn('text-[14px] flex-1', done ? 'text-ldg-ink/55 line-through' : 'text-ldg-ink')}>{t.text}</span>
                  {t.priority && !done && (
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded tracking-wide text-ldg-urgent bg-ldg-urgent/[0.08]">priority</span>
                  )}
                </button>
              )
            })}
            {d.todayTasks && pendingTasks.length === 0 && (
              <p className="font-mono text-[12px] py-2.5 border-t border-ldg-ink/[0.07] text-ldg-ink/55">nothing open</p>
            )}
            <div className="flex gap-2 pt-3 border-t border-ldg-ink/[0.07]">
              <input value={newTask} onChange={e => setNewTask(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { d.addTask(d.todayStr, newTask); setNewTask('') } }}
                placeholder="Add a task for today"
                className="flex-1 min-w-0 rounded-lg px-3 py-2 text-[14px] bg-ldg-paper border border-ldg-ink/10 focus:outline-none" />
              <SolidBtn onClick={() => { d.addTask(d.todayStr, newTask); setNewTask('') }}>Add</SolidBtn>
            </div>
          </div>

          <div className="mt-5">
            <div className="flex items-baseline justify-between">
              <Label>Tomorrow</Label>
              <span className="font-mono text-[12px] text-ldg-ink/55">{tomorrowList.length} planned</span>
            </div>
            <div className="mt-1">
              {tomorrowList.map(t => (
                <div key={t.id} className="flex items-center gap-3 py-2.5 border-t border-ldg-ink/[0.07]">
                  <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', t.priority ? 'bg-ldg-urgent' : 'bg-ldg-ink/40')} />
                  <span className="text-[14px] flex-1">{t.text}</span>
                </div>
              ))}
              {tomorrowList.length === 0 && (
                <p className="font-mono text-[12px] py-2.5 border-t border-ldg-ink/[0.07] text-ldg-ink/55">nothing planned yet</p>
              )}
              <div className="flex gap-2 pt-3 border-t border-ldg-ink/[0.07]">
                <input value={newTomorrow} onChange={e => setNewTomorrow(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { d.addTask(d.tomorrowStr, newTomorrow); setNewTomorrow('') } }}
                  placeholder="Plan something for tomorrow"
                  className="flex-1 min-w-0 rounded-lg px-3 py-2 text-[14px] bg-ldg-paper border border-ldg-ink/10 focus:outline-none" />
                <GhostBtn onClick={() => { d.addTask(d.tomorrowStr, newTomorrow); setNewTomorrow('') }}>Add</GhostBtn>
              </div>
            </div>
          </div>
        </Card>

        {/* Water */}
        <Card className="p-5">
          <div className="flex items-baseline justify-between">
            <Label>Water</Label>
            <span className="font-mono text-[13px] tabular-nums font-semibold">{(waterMl / 1000).toFixed(1)}L <span className="text-ldg-ink/55 font-normal">/ 3L</span></span>
          </div>
          <div className="mt-3 h-[6px] rounded-full overflow-hidden bg-ldg-ink/[0.07]">
            <div className="h-full rounded-full bg-ldg-green transition-all duration-500" style={{ width: `${Math.min(100, (waterMl / 3000) * 100)}%` }} />
          </div>
          <div className="mt-3.5 flex gap-2">
            <GhostBtn onClick={() => d.logWater('Water', 250)}>+ 250ml</GhostBtn>
            <GhostBtn onClick={() => d.logWater('Water', 500)}>+ 500ml</GhostBtn>
          </div>
          <p className="font-mono text-[11px] mt-2.5 flex items-center gap-1 text-ldg-ink/55">
            <Droplets size={11} /> only water moves the bar
          </p>
        </Card>

        {/* Accounts */}
        {pinned.length > 0 && (
          <Card className="p-5">
            <Label>Accounts</Label>
            <div className="mt-1">
              {pinned.map(acc => (
                <Link key={acc.id} href="/finance" className="flex items-baseline justify-between py-3 group border-t border-ldg-ink/[0.07]">
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
              <Link href="/schedule" className="font-mono text-[12px] underline underline-offset-2 text-ldg-ink/55">full schedule</Link>
            </div>
            <div className="mt-1">
              {d.agenda!.map(item => (
                <div key={item.id} className="flex items-baseline gap-4 py-2.5 border-t border-ldg-ink/[0.07]">
                  <span className="font-mono text-[12px] tabular-nums w-12 shrink-0 text-ldg-ink/55">{item.time}</span>
                  <span className="w-1.5 h-1.5 rounded-full shrink-0 self-center" style={{ background: item.color }} />
                  <span className="text-[14px]">{item.title}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Food map */}
        <Card className="p-5" as="div">
          <Label>Food map</Label>
          <div className="mt-3 rounded-xl overflow-hidden">
            <ErrorBoundary fallback={
              <div className="h-44 flex items-center justify-center text-sm text-ldg-ink/40 bg-ldg-ink/[0.03]">
                Food map couldn't load — check the Google Maps API key/restrictions.
              </div>
            }>
              <FoodMapPreview />
            </ErrorBoundary>
          </div>
        </Card>

      </div>

      <QuickFab actions={HOME_ACTIONS} />
    </div>
  )
}
