'use client'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { formatEUR, formatRSD } from '@/lib/utils'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { GlobalSearch } from '@/components/layout/GlobalSearch'
import { ModuleDock } from '@/components/layout/ModuleDock'
import { Ambient } from '@/components/layout/AppShell'
import { Mascot, MascotMood } from '@/components/ui/Mascot'
import {
  TrendingUp, TrendingDown, FileText, ArrowRight, ChevronRight, Wallet, BarChart3,
  Sparkles, Dumbbell, CalendarDays, BookOpen, MapPin, FolderLock, Clapperboard,
  Users, Utensils, Dumbbell as WorkoutIcon,
} from 'lucide-react'

const FoodMapPreview = dynamic(
  () => import('@/components/food/FoodMapPreview').then(m => m.FoodMapPreview),
  { ssr: false, loading: () => <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-3xl animate-pulse" /> }
)

interface DashboardData {
  finance: {
    totalBalanceEUR: number
    incomeThisMonthRSD: number
    expensesThisMonthRSD: number
    upcomingBills: { id: string; name: string; amount: number; currency: string; dayOfMonth: number }[]
    manualRate: number
    liveRate: number
  }
  life: {
    habitsScheduledToday: number
    habitsCompletedToday: number
  }
}

interface RightNowItem { id: string; kind: 'meeting' | 'meal' | 'habit' | 'training'; title: string; detail: string; href: string }
interface RightNow { top: RightNowItem | null; upcoming: RightNowItem[]; timeOfDay: string; mood: MascotMood }

const KIND_ICON: Record<string, any> = { meeting: Users, meal: Utensils, habit: Sparkles, training: WorkoutIcon }

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

// Training plan by day of week (1=Mon … 7=Sun) — used only when Right Now
// has nothing more pressing to show, as the "your day at a glance" fallback
const DAY_PLAN: Record<number, { activity: string; emoji: string }> = {
  1: { activity: 'PT Session',  emoji: '🏋️' },
  2: { activity: 'Bike Ride',   emoji: '🚴' },
  3: { activity: 'PT Session',  emoji: '🏋️' },
  4: { activity: 'Active Rest', emoji: '🧘' },
  5: { activity: 'PT Session',  emoji: '🏋️' },
  6: { activity: 'Long Ride',   emoji: '🚴' },
  7: { activity: 'Full Rest',   emoji: '😴' },
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

// Canvas tint drifts gently with the clock — warmer near dawn/dusk, quieter at midday
function timeOfDayGlow(): string {
  const h = new Date().getHours() + new Date().getMinutes() / 60
  if (h < 6 || h >= 21) return '120 100 140'   // night — quiet plum
  if (h < 10) return '232 150 100'              // dawn — warm coral/gold
  if (h < 17) return '220 161 84'               // day — steady amber
  return '217 120 130'                          // dusk — deeper rose
}

/** Apple-Watch-style progress ring, warm-toned */
function ActivityRing({ completed, total }: { completed: number; total: number }) {
  const pct = total > 0 ? Math.min(completed / total, 1) : 0
  const R = 26, C = 2 * Math.PI * R
  return (
    <div className="relative w-[64px] h-[64px] shrink-0">
      <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
        <circle cx="32" cy="32" r={R} fill="none" strokeWidth="7" stroke="rgb(var(--canvas-alt))" />
        <circle cx="32" cy="32" r={R} fill="none" strokeWidth="7" strokeLinecap="round"
          stroke="url(#ringGrad)" strokeDasharray={C} strokeDashoffset={C * (1 - pct)}
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.25, 0.1, 0.25, 1)' }} />
        <defs>
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgb(232,120,90)" /><stop offset="100%" stopColor="rgb(220,161,84)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold text-ink leading-none">{completed}<span className="text-ink/40">/{total}</span></span>
      </div>
    </div>
  )
}

export default function HomePage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [rightNow, setRightNow] = useState<RightNow | null>(null)
  const [name, setName] = useState('')
  const today = new Date()
  const dateStr = today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
  const todayDow = today.getDay() || 7
  const plan = DAY_PLAN[todayDow]

  useEffect(() => {
    fetch('/api/dashboard').then(r => r.json()).then(setData).catch(() => {})
    fetch('/api/right-now').then(r => r.json()).then(setRightNow).catch(() => {})
    setName(localStorage.getItem('userName') ?? '')
  }, [])

  const glow = timeOfDayGlow()
  const KindIcon = rightNow?.top ? KIND_ICON[rightNow.top.kind] : null

  return (
    <div className="relative flex min-h-screen bg-canvas dark:bg-canvas">
      <Ambient glow={glow} />
      <ModuleDock />
      <div className="relative z-10 flex-1 min-w-0">
        <header className="sticky top-0 z-30 bg-canvas/60 dark:bg-canvas/60 backdrop-blur-xl border-b border-black/5 dark:border-white/5 px-5 md:px-8 py-4 flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold tracking-widest text-ink/40 uppercase">{dateStr}</p>
            <h1 className="text-[28px] font-black text-ink leading-tight tracking-tight">
              {greeting()}{name ? `, ${name}` : ''}
            </h1>
          </div>
          <div className="flex items-center gap-2 pb-1">
            <div className="md:hidden"><GlobalSearch mobileIconOnly /></div>
            <div className="hidden md:block"><GlobalSearch /></div>
            <ThemeToggle />
          </div>
        </header>

        <main className="page-in max-w-4xl mx-auto px-4 md:px-6 py-6 space-y-7 pb-16">

          {/* ── Right Now: the one thing that matters, right now ── */}
          <div className="bg-surface/90 rounded-3xl border border-black/5 dark:border-white/5 shadow-sm p-5">
            <div className="flex items-start gap-4">
              <Mascot mood={rightNow?.mood ?? 'content'} size={56} className="mascot-pop shrink-0" />
              <div className="flex-1 min-w-0">
                {!rightNow ? (
                  <div className="h-12 bg-canvas-alt rounded-xl animate-pulse" />
                ) : rightNow.top ? (
                  <>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-ink/35 flex items-center gap-1.5">
                      {KindIcon && <KindIcon size={11} />} Right now
                    </p>
                    <p className="text-xl font-black text-ink tracking-tight leading-tight mt-0.5">{rightNow.top.title}</p>
                    <p className="text-sm text-ink/50 mt-0.5">{rightNow.top.detail}</p>
                    <Link href={rightNow.top.href}
                      className="inline-flex items-center gap-1 text-xs font-bold text-[rgb(var(--coral))] hover:underline mt-2">
                      Take a look <ChevronRight size={12} />
                    </Link>
                  </>
                ) : (
                  <>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-ink/35">Right now</p>
                    <p className="text-xl font-black text-ink tracking-tight leading-tight mt-0.5">You're clear for a bit.</p>
                    <p className="text-sm text-ink/50 mt-0.5">Nothing urgent — {plan.emoji} {plan.activity.toLowerCase()} is still on for today.</p>
                  </>
                )}
              </div>
            </div>

            {rightNow && rightNow.upcoming.length > 0 && (
              <div className="mt-4 pt-4 border-t border-black/5 dark:border-white/5 flex gap-4 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                {rightNow.upcoming.map(item => {
                  const Icon = KIND_ICON[item.kind]
                  return (
                    <Link key={item.id} href={item.href} className="flex items-center gap-2 shrink-0 group">
                      <span className="w-7 h-7 rounded-full bg-canvas-alt flex items-center justify-center shrink-0">
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

          {/* ── Your world: quieter, secondary, real numbers still a tap away ── */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-ink/40 mb-2 px-1">Your world</h2>
            <div className="bg-surface/90 rounded-3xl border border-black/5 dark:border-white/5 shadow-sm divide-y divide-black/5 dark:divide-white/5">
              <Link href="/life" className="flex items-center gap-3 px-4 py-3 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                {data ? <ActivityRing completed={data.life.habitsCompletedToday} total={data.life.habitsScheduledToday} />
                      : <div className="w-16 h-16 rounded-full bg-canvas-alt animate-pulse shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink">Habits today</p>
                  <p className="text-xs text-ink/40">{data ? `${data.life.habitsCompletedToday} of ${data.life.habitsScheduledToday} done` : '…'}</p>
                </div>
                <ChevronRight size={16} className="text-ink/20 shrink-0" />
              </Link>

              <Link href="/finance" className="flex items-center gap-3 px-4 py-3 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                <span className="w-10 h-10 rounded-xl bg-[rgb(232,120,90)]/10 flex items-center justify-center shrink-0"><Wallet size={17} className="text-[rgb(232,120,90)]" /></span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink">{data ? formatEUR(data.finance.totalBalanceEUR) : '…'}</p>
                  <p className="text-xs text-ink/40">Total balance</p>
                </div>
                <ChevronRight size={16} className="text-ink/20 shrink-0" />
              </Link>

              <Link href="/finance/insights" className="flex items-center gap-3 px-4 py-3 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                <span className="w-10 h-10 rounded-xl bg-[rgb(220,161,84)]/10 flex items-center justify-center shrink-0"><BarChart3 size={17} className="text-[rgb(220,161,84)]" /></span>
                <div className="flex-1 min-w-0 flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1 text-emerald-500 font-medium"><TrendingUp size={11} /> {data ? formatRSD(data.finance.incomeThisMonthRSD) : '…'}</span>
                  <span className="flex items-center gap-1 text-[rgb(var(--coral))] font-medium"><TrendingDown size={11} /> {data ? formatRSD(data.finance.expensesThisMonthRSD) : '…'}</span>
                </div>
                <ChevronRight size={16} className="text-ink/20 shrink-0" />
              </Link>
            </div>
          </div>

          {/* ── Quick actions ── */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0" style={{ scrollbarWidth: 'none' }}>
            {[
              { href: '/finance/scan', label: '📷 Scan receipt' },
              { href: '/finance/expenses/personal', label: '💸 Add expense' },
              { href: '/life', label: '☀️ Check habits' },
              { href: '/fitness/body', label: '⚖️ Log weight' },
              { href: '/schedule', label: '📅 My schedule' },
            ].map(q => (
              <Link key={q.href} href={q.href}
                className="shrink-0 bg-surface/90 dark:bg-surface/70 border border-black/5 dark:border-white/5 shadow-sm rounded-full px-4 py-2 text-sm font-medium text-ink/80 hover:shadow-md active:scale-95 transition-all duration-300 ease-apple whitespace-nowrap">
                {q.label}
              </Link>
            ))}
          </div>

          {/* ── Upcoming bills ── */}
          {data && data.finance.upcomingBills.length > 0 && (
            <div className="bg-surface/90 dark:bg-surface/70 rounded-3xl border border-black/5 dark:border-white/5 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-black/5 dark:border-white/5 flex items-center justify-between">
                <h2 className="font-semibold text-ink text-sm flex items-center gap-2">
                  <FileText size={15} className="text-ink/30" /> Upcoming bills
                </h2>
                <Link href="/finance/bills" className="text-xs text-[rgb(var(--coral))] hover:underline flex items-center gap-1">
                  View all <ArrowRight size={11} />
                </Link>
              </div>
              <div className="divide-y divide-black/5 dark:divide-white/5">
                {data.finance.upcomingBills.map(bill => (
                  <div key={bill.id} className="px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-ink/40 w-6 text-center font-mono">{bill.dayOfMonth}</span>
                      <span className="text-sm text-ink/80">{bill.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-ink">
                      {bill.amount.toLocaleString()} {bill.currency}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── App grid ── */}
          <div>
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
