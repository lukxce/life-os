'use client'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { cn, formatEUR, formatRSD } from '@/lib/utils'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { GlobalSearch } from '@/components/layout/GlobalSearch'
import { ModuleDock } from '@/components/layout/ModuleDock'
import { Ambient } from '@/components/layout/AppShell'
import { Mascot, MascotMood } from '@/components/ui/Mascot'
import {
  FileText, ChevronRight, Wallet, Sparkles, Flame,
  Dumbbell, CalendarDays, BookOpen, MapPin, FolderLock, Clapperboard,
  Users, Utensils, Dumbbell as WorkoutIcon, Check, X,
} from 'lucide-react'

const FoodMapPreview = dynamic(
  () => import('@/components/food/FoodMapPreview').then(m => m.FoodMapPreview),
  { ssr: false, loading: () => <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-3xl animate-pulse" /> }
)

interface DashboardData {
  finance: { upcomingBills: { id: string; name: string; amount: number; currency: string; dayOfMonth: number }[] }
  life: { habitsScheduledToday: number; habitsCompletedToday: number }
}
interface RightNowItem {
  id: string; kind: 'meeting' | 'meal' | 'habit' | 'training'; title: string; detail: string; href: string
  habits?: { id: string; name: string }[]
  mealAsk?: { mealType: string; date: string }
}
interface RightNow {
  top: RightNowItem | null; upcomingCalendar: RightNowItem[]; timeOfDay: string; mood: MascotMood
  todayRoutine: TodayRoutineRow[]; todayCalendarEvents: TodayCalendarRow[]
}
interface DayScore { date: string; score: number; completed: number; total: number }
interface DayScores { days: DayScore[]; bestStreak: { name: string; icon: string | null; count: number } }
interface AccountRow { id: string; name: string; currency: string; currentBalance: number; pinned: boolean }
interface AgendaItem { id: string; time: string; minutes: number; title: string; source: 'routine' | 'calendar'; color?: string }
interface TodayRoutineRow { id: string; startTime: string; endTime: string | null; name: string }
interface TodayCalendarRow { id: string; time: string; minutes: number; title: string; color: string }

const KIND_ICON: Record<string, any> = { meeting: Users, meal: Utensils, habit: Sparkles, training: WorkoutIcon }
const KIND_TINT: Record<string, string> = {
  habit:    'bg-[rgb(167,120,160)]/[0.08] border-[rgb(167,120,160)]/20',
  meal:     'bg-[rgb(220,161,84)]/[0.08] border-[rgb(220,161,84)]/20',
  training: 'bg-[rgb(220,161,84)]/[0.08] border-[rgb(220,161,84)]/20',
  meeting:  'bg-[rgb(217,138,148)]/[0.08] border-[rgb(217,138,148)]/20',
  default:  'bg-surface/90 border-black/5 dark:border-white/5',
}
const KIND_ACCENT: Record<string, string> = {
  habit: 'rgb(167,120,160)', meal: 'rgb(220,161,84)', training: 'rgb(220,161,84)', meeting: 'rgb(217,138,148)',
}

const MODULES = [
  { href: '/finance',   icon: Wallet,       title: 'Finance',   gradient: 'from-[rgb(232,120,90)] to-[rgb(220,161,84)]' },
  { href: '/life',      icon: Sparkles,     title: 'Habits',    gradient: 'from-[rgb(167,120,160)] to-[rgb(217,138,148)]' },
  { href: '/fitness',   icon: Dumbbell,     title: 'Fitness',   gradient: 'from-[rgb(220,161,84)] to-[rgb(232,120,90)]' },
  { href: '/schedule',  icon: CalendarDays, title: 'Schedule',  gradient: 'from-[rgb(217,138,148)] to-[rgb(167,120,160)]' },
  { href: '/journal',   icon: BookOpen,     title: 'Journal',   gradient: 'from-[rgb(220,161,84)] to-[rgb(217,138,148)]' },
  { href: '/food',      icon: MapPin,       title: 'Food Map',  gradient: 'from-[rgb(232,120,90)] to-[rgb(217,138,148)]' },
  { href: '/personal',  icon: FolderLock,   title: 'Personal',  gradient: 'from-[rgb(167,120,160)] to-[rgb(220,161,84)]' },
  { href: '/watchlist', icon: Clapperboard, title: 'Watchlist', gradient: 'from-[rgb(217,138,148)] to-[rgb(232,120,90)]' },
]

function greeting(h: number) {
  if (h < 5) return 'Still up?'
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  if (h < 22) return 'Good evening'
  return 'Late one'
}
function timeOfDayGlow(h: number): string {
  if (h < 6 || h >= 21) return '120 100 140'
  if (h < 10) return '232 150 100'
  if (h < 17) return '220 161 84'
  return '217 120 130'
}
function toLocalDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function toMinutes(hhmm: string) { const [h, m] = hhmm.split(':').map(Number); return h * 60 + (m ?? 0) }

/** Real per-day completion states, with an honest partial state — not just done/missed */
function StreakStrip({ days }: { days: DayScore[] }) {
  const today = toLocalDateStr(new Date())
  return (
    <div>
      <div className="flex items-center gap-1.5">
        {days.map(d => {
          const isToday = d.date === today
          const label = new Date(d.date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'narrow' })
          const nothingScheduled = d.total === 0
          const full = d.total > 0 && d.completed === d.total
          const pct = d.total > 0 ? Math.round((d.completed / d.total) * 100) : 0
          // Today isn't "missed" just because it's not done yet — the day isn't over
          const showPartial = d.total > 0 && !full && (isToday || d.completed > 0)

          let inner: React.ReactNode = null
          if (nothingScheduled) inner = isToday ? <span className="w-2 h-2 rounded-full bg-[rgb(var(--coral))]" /> : null
          else if (full) inner = '🔥'
          else if (showPartial) inner = <span className="text-[9px] font-bold text-ink/55">{d.completed}/{d.total}</span>
          else inner = <X size={13} strokeWidth={2.5} className="text-ink/25" />

          return (
            <div key={d.date} className="flex flex-col items-center gap-1">
              <span className="text-[9px] font-bold text-ink/30 uppercase">{label}</span>
              <div
                className={cn('w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all',
                  isToday ? 'border-[rgb(var(--coral))]' : 'border-transparent',
                  !showPartial && (full ? 'bg-[rgb(220,161,84)]/15' : nothingScheduled ? 'bg-transparent' : 'bg-canvas-alt'))}
                style={showPartial ? { background: `conic-gradient(rgb(220,161,84) ${pct}%, rgb(var(--canvas-alt)) ${pct}% 100%)` } : undefined}
              >
                <span className={cn('flex items-center justify-center text-sm', showPartial && 'w-[26px] h-[26px] rounded-full bg-surface')}>
                  {inner}
                </span>
              </div>
            </div>
          )
        })}
      </div>
      <div className="flex items-center gap-3 mt-2 px-0.5 text-[9px] font-medium text-ink/35">
        <span>🔥 all done</span>
        <span>3/5 partial</span>
        <span className="flex items-center gap-0.5"><X size={9} strokeWidth={2.5} /> none done</span>
      </div>
    </div>
  )
}

export default function HomePage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [rightNow, setRightNow] = useState<RightNow | null>(null)
  const [dayScores, setDayScores] = useState<DayScores | null>(null)
  const [agenda, setAgenda] = useState<AgendaItem[] | null>(null)
  const [accounts, setAccounts] = useState<AccountRow[] | null>(null)
  const [justDone, setJustDone] = useState<Set<string>>(new Set())
  const [removed, setRemoved] = useState<Set<string>>(new Set())
  const [mealAnswer, setMealAnswer] = useState('')
  const [mealAnswered, setMealAnswered] = useState<Set<string>>(new Set())
  const [name, setName] = useState('')
  const [displayNow] = useState(() => new Date())
  const hour = displayNow.getHours()
  const nowMin = hour * 60 + displayNow.getMinutes()
  const dateStr = displayNow.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

  const loadRightNow = useCallback(() => {
    const n = new Date()
    const p = new URLSearchParams({
      h: String(n.getHours()), m: String(n.getMinutes()),
      dow: String(n.getDay()), date: toLocalDateStr(n), ts: String(n.getTime()),
    })
    fetch(`/api/right-now?${p}`).then(r => r.json()).then((rn: RightNow) => {
      setRightNow(rn)
      // Today's agenda comes straight off this response — right-now already
      // fetched every calendar once; Home doesn't need a second round of
      // external ICS requests just to build the same day's list again
      const routine: AgendaItem[] = (rn.todayRoutine ?? []).map(b => ({
        id: `routine-${b.id}`, time: b.startTime, minutes: toMinutes(b.startTime), title: b.name, source: 'routine',
      }))
      const calendarItems: AgendaItem[] = (rn.todayCalendarEvents ?? []).map(e => ({
        id: e.id, time: e.time, minutes: e.minutes, title: e.title, source: 'calendar', color: e.color,
      }))
      setAgenda([...calendarItems, ...routine].sort((a, b) => a.minutes - b.minutes))
    }).catch(() => {})
  }, [])

  useEffect(() => {
    const n = new Date()
    const p = new URLSearchParams({ day: String(n.getDate()) })
    fetch(`/api/dashboard?${p}`).then(r => r.json()).then(setData).catch(() => {})
    fetch('/api/life/day-scores?days=7').then(r => r.json()).then(setDayScores).catch(() => {})
    loadRightNow()
    setName(localStorage.getItem('userName') ?? '')

    // Real pinned account balances
    fetch('/api/finance/accounts').then(r => r.json()).then((accs: AccountRow[]) => setAccounts(accs)).catch(() => {})

    const interval = setInterval(loadRightNow, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [loadRightNow])

  async function toggleHabit(habitId: string) {
    setJustDone(prev => new Set(prev).add(habitId))
    setTimeout(() => setRemoved(prev => new Set(prev).add(habitId)), 650)
    try {
      const res = await fetch('/api/life/logs', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ habitId, date: toLocalDateStr(new Date()) + 'T12:00:00.000Z', completed: true }),
      })
      if (!res.ok) throw new Error()
      setTimeout(loadRightNow, 700)
    } catch {
      toast.error("Couldn't save that — try again")
      setJustDone(prev => { const n = new Set(prev); n.delete(habitId); return n })
    }
  }

  async function submitMeal(itemId: string, ask: { mealType: string; date: string }, description: string | null) {
    setMealAnswered(prev => new Set(prev).add(itemId))
    setMealAnswer('')
    try {
      const res = await fetch('/api/life/meal-log', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: ask.date, mealType: ask.mealType, description }),
      })
      if (!res.ok) throw new Error()
      setTimeout(loadRightNow, 400)
    } catch {
      toast.error("Couldn't save that — try again")
      setMealAnswered(prev => { const n = new Set(prev); n.delete(itemId); return n })
    }
  }

  const glow = timeOfDayGlow(hour)
  // Defensive: a top item with no real title isn't a top item — fall back cleanly
  const hasTop = !!(rightNow?.top && rightNow.top.title && rightNow.top.title.trim())
  const kind = hasTop ? rightNow!.top!.kind : 'default'
  const KindIcon = hasTop ? KIND_ICON[kind] : null
  const tint = KIND_TINT[kind] ?? KIND_TINT.default
  const accent = KIND_ACCENT[kind] ?? 'var(--coral)'
  const habitList = rightNow?.top?.habits?.filter(h => !removed.has(h.id)) ?? []
  const allJustFinished = rightNow?.top?.kind === 'habit' && habitList.every(h => justDone.has(h.id)) && habitList.length > 0
  const streak = dayScores?.bestStreak
  const billsToday = data?.finance.upcomingBills ?? []
  const pinnedAccounts = accounts?.filter(a => a.pinned) ?? []

  return (
    <div className="relative flex min-h-screen bg-canvas dark:bg-canvas">
      <Ambient glow={glow} />
      <ModuleDock />
      <div className="relative z-10 flex-1 min-w-0">
        <header className="sticky top-0 z-30 bg-canvas/60 dark:bg-canvas/60 backdrop-blur-xl border-b border-black/5 dark:border-white/5 px-5 md:px-8 py-4 flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold tracking-widest text-ink/40 uppercase">{dateStr}</p>
            <h1 className="text-[28px] font-black text-ink leading-tight tracking-tight">
              {greeting(hour)}{name ? `, ${name}` : ''}
            </h1>
          </div>
          <div className="flex items-center gap-2 pb-1">
            <div className="md:hidden"><GlobalSearch mobileIconOnly /></div>
            <div className="hidden md:block"><GlobalSearch /></div>
            <ThemeToggle />
          </div>
        </header>

        <main className="page-in max-w-4xl mx-auto px-4 md:px-6 py-6 space-y-5 pb-16">

          {/* ── Streak strip: the last week, real completion data ── */}
          {dayScores && dayScores.days.length > 0 && (
            <div className="bg-surface/90 rounded-3xl border border-black/5 dark:border-white/5 shadow-sm px-4 py-3.5 flex items-center justify-between overflow-x-auto"
              style={{ scrollbarWidth: 'none' }}>
              <StreakStrip days={dayScores.days} />
              {streak && streak.count >= 2 && (
                <span className="flex items-center gap-1 text-xs font-bold text-[rgb(220,161,84)] shrink-0 ml-3">
                  <Flame size={13} /> {streak.count}
                </span>
              )}
            </div>
          )}

          {/* ── Right Now ── */}
          <div className={cn('rounded-3xl border shadow-sm p-5 transition-colors duration-500', tint)}>
            <div className="flex items-start gap-4">
              <Mascot mood={habitList.length === 0 && rightNow?.top?.kind === 'habit' ? 'pleased' : (rightNow?.mood ?? 'content')} size={56} className="mascot-pop shrink-0" />
              <div className="flex-1 min-w-0">
                {!rightNow ? (
                  <div className="h-12 bg-canvas-alt rounded-xl animate-pulse" />
                ) : hasTop && (rightNow!.top!.kind !== 'habit' || habitList.length > 0) ? (
                  <>
                    <p className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5" style={{ color: accent }}>
                      {KindIcon && <KindIcon size={11} />} Right now
                    </p>
                    <p className="text-xl font-black text-ink tracking-tight leading-tight mt-0.5">{rightNow!.top!.title}</p>
                    <p className="text-sm text-ink/50 mt-0.5">{rightNow!.top!.detail}</p>

                    {rightNow!.top!.kind === 'habit' ? (
                      <div className="mt-3 space-y-1.5">
                        {habitList.map(h => {
                          const done = justDone.has(h.id)
                          return (
                            <button key={h.id} onClick={() => !done && toggleHabit(h.id)}
                              className={cn('flex items-center gap-2.5 w-full text-left px-3 py-2 rounded-xl transition-all duration-500',
                                done ? 'bg-emerald-500/10' : 'bg-surface/70 hover:bg-surface group')}>
                              <span className={cn('w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all',
                                done ? 'bg-emerald-500 border-emerald-500 scale-110' : 'border-ink/20 group-hover:border-[rgb(var(--coral))]')}>
                                {done && <Check size={12} className="text-white" strokeWidth={3} />}
                              </span>
                              <span className={cn('text-sm transition-all', done ? 'text-ink/40 line-through' : 'text-ink/80 group-hover:text-ink')}>{h.name}</span>
                            </button>
                          )
                        })}
                      </div>
                    ) : rightNow!.top!.mealAsk && !mealAnswered.has(rightNow!.top!.id) ? (
                      <div className="mt-3 space-y-2">
                        <input
                          value={mealAnswer}
                          onChange={e => setMealAnswer(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && mealAnswer.trim()) submitMeal(rightNow!.top!.id, rightNow!.top!.mealAsk!, mealAnswer.trim())
                          }}
                          placeholder="What did you actually eat?"
                          className="w-full bg-surface/70 rounded-xl px-3 py-2 text-sm text-ink placeholder:text-ink/30 border border-black/5 dark:border-white/5 focus:outline-none focus:border-[rgb(var(--coral))]"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => mealAnswer.trim() && submitMeal(rightNow!.top!.id, rightNow!.top!.mealAsk!, mealAnswer.trim())}
                            className="flex-1 text-xs font-bold rounded-lg py-2 text-white" style={{ background: accent }}>
                            Log it
                          </button>
                          <button
                            onClick={() => submitMeal(rightNow!.top!.id, rightNow!.top!.mealAsk!, null)}
                            className="text-xs font-medium text-ink/40 hover:text-ink/70 px-3">
                            Didn't eat / skip
                          </button>
                        </div>
                      </div>
                    ) : (
                      <Link href={rightNow!.top!.href}
                        className="inline-flex items-center gap-1 text-xs font-bold hover:underline mt-2" style={{ color: accent }}>
                        Take a look <ChevronRight size={12} />
                      </Link>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-ink/35">Right now</p>
                    <p className="text-xl font-black text-ink tracking-tight leading-tight mt-0.5">
                      {allJustFinished ? "That's everything — nicely done." : "You're clear for a bit."}
                    </p>
                    <p className="text-sm text-ink/50 mt-0.5">
                      {streak && streak.count >= 3
                        ? `${streak.icon ?? '🔥'} ${streak.count} days running on ${streak.name} — keep it going.`
                        : 'Nothing urgent right now.'}
                    </p>
                  </>
                )}
              </div>
            </div>

            {rightNow && (
              <div className="mt-4 pt-4 border-t border-black/10 dark:border-white/10">
                {rightNow.upcomingCalendar.length > 0 ? (
                  <div className="flex gap-4 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                    {rightNow.upcomingCalendar.map(item => (
                      <Link key={item.id} href={item.href} className="flex items-center gap-2 shrink-0 group">
                        <span className="w-7 h-7 rounded-full bg-surface/70 flex items-center justify-center shrink-0">
                          <Users size={13} className="text-ink/50" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-ink/80 truncate max-w-[140px] group-hover:text-ink">{item.title}</p>
                          <p className="text-[10px] text-ink/35">{item.detail}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-ink/40 flex items-center gap-1.5">
                    <CalendarDays size={12} /> Nothing else on your calendar today — enjoy the rest of it.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* ── Today's agenda: real calendar events merged with your recurring routine ── */}
          {agenda === null ? (
            <div className="h-20 bg-canvas-alt rounded-3xl animate-pulse" />
          ) : agenda.length > 0 && (
            <div className="bg-surface/90 rounded-3xl border border-black/5 dark:border-white/5 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-black/5 dark:border-white/5 flex items-center justify-between">
                <h2 className="text-[10px] font-bold uppercase tracking-widest text-ink/40 flex items-center gap-1.5">
                  <CalendarDays size={12} /> Today
                </h2>
                <Link href="/schedule" className="text-xs text-[rgb(var(--coral))] hover:underline">Full schedule →</Link>
              </div>
              <div className="divide-y divide-black/5 dark:divide-white/5">
                {agenda.map(item => {
                  const end = item.minutes + 30
                  const isNow = item.minutes >= 0 && nowMin >= item.minutes && nowMin <= end
                  const isPast = item.minutes >= 0 && nowMin > end
                  return (
                    <div key={item.id} className={cn('flex items-center gap-3 px-5 py-2.5', isPast && 'opacity-40')}>
                      <span className={cn('text-xs font-mono w-14 shrink-0', isNow ? 'font-bold text-[rgb(var(--coral))]' : 'text-ink/35')}>{item.time}</span>
                      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', item.source === 'routine' && 'opacity-40')}
                        style={{ background: item.color ?? 'rgb(var(--coral))' }} />
                      <span className={cn('text-sm flex-1', isNow ? 'font-bold text-ink' : 'text-ink/70')}>{item.title}</span>
                      {item.source === 'routine' && <span className="text-[9px] font-bold uppercase tracking-wide text-ink/25 shrink-0">Routine</span>}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Money: the accounts you actually pinned, real balances ── */}
          {pinnedAccounts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {pinnedAccounts.map(acc => (
                <Link key={acc.id} href="/finance"
                  className="bg-surface/90 rounded-2xl border border-black/5 dark:border-white/5 shadow-sm p-4 hover:shadow-md active:scale-[0.98] transition-all">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-ink/35 truncate">{acc.name}</p>
                  <p className="text-xl font-black text-ink tracking-tight mt-1">
                    {acc.currency === 'EUR' ? formatEUR(acc.currentBalance) : formatRSD(acc.currentBalance)}
                  </p>
                </Link>
              ))}
            </div>
          ) : accounts && accounts.length > 0 && (
            <Link href="/finance/accounts"
              className="block bg-surface/90 rounded-3xl border border-black/5 dark:border-white/5 shadow-sm p-4 text-sm text-ink/50 hover:text-ink transition-colors">
              Pin the accounts you check daily to see them here →
            </Link>
          )}

          {/* ── Quick actions ── */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0" style={{ scrollbarWidth: 'none' }}>
            {[
              { href: '/finance/scan', label: '📷 Scan receipt' },
              { href: '/finance/expenses/personal', label: '💸 Add expense' },
              { href: '/schedule', label: '📅 My schedule' },
            ].map(q => (
              <Link key={q.href} href={q.href}
                className="shrink-0 bg-surface/90 dark:bg-surface/70 border border-black/5 dark:border-white/5 shadow-sm rounded-full px-4 py-2 text-sm font-medium text-ink/80 hover:shadow-md active:scale-95 transition-all duration-300 ease-apple whitespace-nowrap">
                {q.label}
              </Link>
            ))}
          </div>

          {/* ── Bills — only ever what's due today ── */}
          {billsToday.length > 0 && (
            <div className="bg-[rgb(var(--coral))]/10 rounded-3xl border border-[rgb(var(--coral))]/20 shadow-sm p-5">
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-[rgb(var(--coral))] mb-2 flex items-center gap-1.5">
                <FileText size={12} /> Due today
              </h2>
              {billsToday.map(bill => (
                <div key={bill.id} className="flex items-center justify-between">
                  <span className="text-base font-semibold text-ink">{bill.name}</span>
                  <span className="text-base font-black text-ink">{bill.amount.toLocaleString()} {bill.currency}</span>
                </div>
              ))}
            </div>
          )}

          {/* ── App grid — mobile only; desktop already has the dock ── */}
          <div className="lg:hidden">
            <h2 className="text-xs font-bold uppercase tracking-widest text-ink/40 mb-3 px-1">Modules</h2>
            <div className="grid grid-cols-4 gap-x-2 gap-y-5 sm:grid-cols-8 sm:gap-x-3">
              {MODULES.map(m => (
                <Link key={m.href} href={m.href} className="group flex flex-col items-center gap-1.5">
                  <span className={`flex items-center justify-center w-[60px] h-[60px] rounded-[18px] bg-gradient-to-br ${m.gradient} shadow-md shadow-black/10 group-hover:scale-105 group-active:scale-95 transition-transform duration-300 ease-apple`}>
                    <m.icon size={26} className="text-white" strokeWidth={1.8} />
                  </span>
                  <span className="text-[11px] font-medium text-ink/70">{m.title}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* ── Food map ── */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-ink/40 mb-3 px-1">Food map</h2>
            <div className="rounded-3xl overflow-hidden border border-black/5 dark:border-white/5 shadow-sm">
              <FoodMapPreview />
            </div>
          </div>

        </main>
      </div>
      <GlobalSearch keyboardOnly />
    </div>
  )
}
