'use client'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { GlobalSearch } from '@/components/layout/GlobalSearch'
import { ModuleDock } from '@/components/layout/ModuleDock'
import { Ambient } from '@/components/layout/AppShell'
import { Mascot, MascotMood } from '@/components/ui/Mascot'
import {
  FileText, ChevronRight, Wallet, Sparkles, Flame,
  Dumbbell, CalendarDays, BookOpen, MapPin, FolderLock, Clapperboard,
  Users, Utensils, Dumbbell as WorkoutIcon, Check, Beef,
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
}
interface RightNow { top: RightNowItem | null; upcoming: RightNowItem[]; timeOfDay: string; mood: MascotMood }
interface DayScore { date: string; score: number; completed: number; total: number }
interface DayScores { days: DayScore[]; bestStreak: { name: string; icon: string | null; count: number } }
interface MealSlot { dayOfWeek: number; calories: number; protein: number }
interface WorkoutEntry { date: string; type: string }

const KIND_ICON: Record<string, any> = { meeting: Users, meal: Utensils, habit: Sparkles, training: WorkoutIcon }
const KIND_TINT: Record<string, string> = {
  habit:    'bg-[rgb(167,120,160)]/[0.08] border-[rgb(167,120,160)]/20',
  meal:     'bg-[rgb(220,161,84)]/[0.08] border-[rgb(220,161,84)]/20',
  training: 'bg-[rgb(220,161,84)]/[0.08] border-[rgb(220,161,84)]/20',
  meeting:  'bg-[rgb(217,138,148)]/[0.08] border-[rgb(217,138,148)]/20',
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

/** Loops-style flame calendar strip — real per-day scores, not decoration */
function StreakStrip({ days }: { days: DayScore[] }) {
  const today = toLocalDateStr(new Date())
  return (
    <div className="flex items-center gap-1.5">
      {days.map(d => {
        const isToday = d.date === today
        const label = new Date(d.date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'narrow' })
        const full = d.total > 0 && d.completed === d.total
        return (
          <div key={d.date} className="flex flex-col items-center gap-1">
            <span className="text-[9px] font-bold text-ink/30 uppercase">{label}</span>
            <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-sm border-2 transition-all',
              isToday ? 'border-[rgb(var(--coral))] bg-[rgb(var(--coral))]/10'
                : full ? 'border-transparent bg-[rgb(220,161,84)]/15'
                : d.total > 0 ? 'border-transparent bg-canvas-alt'
                : 'border-transparent bg-transparent')}>
              {isToday ? (full ? '🔥' : <span className="w-2 h-2 rounded-full bg-[rgb(var(--coral))]" />) : full ? '🔥' : d.total > 0 ? '✕' : ''}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function HomePage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [rightNow, setRightNow] = useState<RightNow | null>(null)
  const [dayScores, setDayScores] = useState<DayScores | null>(null)
  const [nutrition, setNutrition] = useState<{ cal: number; protein: number } | null>(null)
  const [trainingWeek, setTrainingWeek] = useState<number | null>(null)
  const [justDone, setJustDone] = useState<Set<string>>(new Set())
  const [removed, setRemoved] = useState<Set<string>>(new Set())
  const [name, setName] = useState('')
  const [displayNow] = useState(() => new Date())
  const hour = displayNow.getHours()
  const dateStr = displayNow.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

  const loadRightNow = useCallback(() => {
    const n = new Date()
    const p = new URLSearchParams({
      h: String(n.getHours()), m: String(n.getMinutes()),
      dow: String(n.getDay()), date: toLocalDateStr(n), ts: String(n.getTime()),
    })
    fetch(`/api/right-now?${p}`).then(r => r.json()).then(setRightNow).catch(() => {})
  }, [])

  useEffect(() => {
    const n = new Date()
    const p = new URLSearchParams({ day: String(n.getDate()) })
    fetch(`/api/dashboard?${p}`).then(r => r.json()).then(setData).catch(() => {})
    fetch('/api/life/day-scores?days=7').then(r => r.json()).then(setDayScores).catch(() => {})
    loadRightNow()
    setName(localStorage.getItem('userName') ?? '')

    // Real today's nutrition, from the actual meal plan
    const todayDow = n.getDay() || 7
    fetch('/api/fitness/meal-plan').then(r => r.json()).then((slots: MealSlot[]) => {
      const today = slots.filter(s => s.dayOfWeek === todayDow)
      setNutrition({ cal: today.reduce((a, s) => a + s.calories, 0), protein: today.reduce((a, s) => a + s.protein, 0) })
    }).catch(() => {})

    // Real training count this week, from actual logs (manual + habit-driven)
    Promise.all([
      fetch('/api/fitness/workouts?limit=30').then(r => r.json()),
      fetch('/api/fitness/habit-workouts?days=7').then(r => r.json()),
    ]).then(([manual, habitDriven]: [WorkoutEntry[], WorkoutEntry[]]) => {
      const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)
      const all = [...manual, ...habitDriven].filter(w => new Date(w.date) >= weekAgo && (w.type === 'pt' || w.type === 'cardio_bike'))
      const unique = new Set(all.map(w => w.date.slice(0, 10) + w.type))
      setTrainingWeek(unique.size)
    }).catch(() => {})

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

  const glow = timeOfDayGlow(hour)
  const kind = rightNow?.top?.kind ?? 'habit'
  const KindIcon = rightNow?.top ? KIND_ICON[kind] : null
  const tint = KIND_TINT[kind] ?? 'bg-surface/90 border-black/5 dark:border-white/5'
  const accent = KIND_ACCENT[kind] ?? 'var(--coral)'
  const habitList = rightNow?.top?.habits?.filter(h => !removed.has(h.id)) ?? []
  const allJustFinished = rightNow?.top?.kind === 'habit' && habitList.every(h => justDone.has(h.id)) && habitList.length > 0
  const streak = dayScores?.bestStreak
  const billsToday = data?.finance.upcomingBills ?? []

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

          {/* ── Streak strip: the last week, at a glance, real data ── */}
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

          {/* ── Right Now: tinted by what it actually is, not flat white ── */}
          <div className={cn('rounded-3xl border shadow-sm p-5 transition-colors duration-500', tint)}>
            <div className="flex items-start gap-4">
              <Mascot mood={habitList.length === 0 && rightNow?.top?.kind === 'habit' ? 'pleased' : (rightNow?.mood ?? 'content')} size={56} className="mascot-pop shrink-0" />
              <div className="flex-1 min-w-0">
                {!rightNow ? (
                  <div className="h-12 bg-canvas-alt rounded-xl animate-pulse" />
                ) : rightNow.top && habitList.length > 0 ? (
                  <>
                    <p className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5" style={{ color: accent }}>
                      {KindIcon && <KindIcon size={11} />} Right now
                    </p>
                    <p className="text-xl font-black text-ink tracking-tight leading-tight mt-0.5">{rightNow.top.title}</p>
                    <p className="text-sm text-ink/50 mt-0.5">{rightNow.top.detail}</p>

                    {rightNow.top.kind === 'habit' ? (
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
                    ) : (
                      <Link href={rightNow.top.href}
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

            {rightNow && rightNow.upcoming.length > 0 && (
              <div className="mt-4 pt-4 border-t border-black/10 dark:border-white/10 flex gap-4 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                {rightNow.upcoming.map(item => {
                  const Icon = KIND_ICON[item.kind]
                  return (
                    <Link key={item.id} href={item.href} className="flex items-center gap-2 shrink-0 group">
                      <span className="w-7 h-7 rounded-full bg-surface/70 flex items-center justify-center shrink-0">
                        <Icon size={13} className="text-ink/50" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-ink/80 truncate max-w-[140px] group-hover:text-ink">{item.title}</p>
                        <p className="text-[10px] text-ink/35">{item.detail}</p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── Real stat tiles: today's food, this week's training ── */}
          <div className="grid grid-cols-2 gap-3">
            <Link href="/fitness"
              className="rounded-3xl border p-4 shadow-sm hover:shadow-md active:scale-[0.98] transition-all bg-[rgb(220,161,84)]/[0.08] border-[rgb(220,161,84)]/20">
              <div className="flex items-center gap-1.5 text-[rgb(220,161,84)]"><Beef size={13} /><span className="text-[10px] font-bold uppercase tracking-widest">Today's food</span></div>
              {nutrition ? (
                <>
                  <p className="text-2xl font-black text-ink tracking-tight mt-1">{nutrition.cal.toLocaleString()}<span className="text-sm font-medium text-ink/40"> kcal</span></p>
                  <p className="text-xs text-ink/40 mt-0.5">{nutrition.protein}g protein planned</p>
                </>
              ) : <div className="h-10 bg-canvas-alt rounded mt-2 animate-pulse" />}
            </Link>
            <Link href="/fitness/workouts"
              className="rounded-3xl border p-4 shadow-sm hover:shadow-md active:scale-[0.98] transition-all bg-[rgb(167,120,160)]/[0.08] border-[rgb(167,120,160)]/20">
              <div className="flex items-center gap-1.5 text-[rgb(167,120,160)]"><WorkoutIcon size={13} /><span className="text-[10px] font-bold uppercase tracking-widest">This week</span></div>
              {trainingWeek !== null ? (
                <>
                  <p className="text-2xl font-black text-ink tracking-tight mt-1">{trainingWeek}<span className="text-sm font-medium text-ink/40"> sessions</span></p>
                  <p className="text-xs text-ink/40 mt-0.5">logged in the last 7 days</p>
                </>
              ) : <div className="h-10 bg-canvas-alt rounded mt-2 animate-pulse" />}
            </Link>
          </div>

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
