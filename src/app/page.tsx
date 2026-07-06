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
import { TrendingUp, TrendingDown, FileText, ArrowRight, ChevronRight } from 'lucide-react'

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

interface Nudge { id: string; mood: 'curious' | 'content'; message: string; href: string }

const MODULES = [
  { href: '/finance',   emoji: '💰', title: 'Finance',   gradient: 'from-[rgb(232,120,90)] to-[rgb(220,161,84)]' },
  { href: '/life',      emoji: '🧘', title: 'Habits',    gradient: 'from-[rgb(167,120,160)] to-[rgb(217,138,148)]' },
  { href: '/fitness',   emoji: '💪', title: 'Fitness',   gradient: 'from-[rgb(220,161,84)] to-[rgb(232,120,90)]' },
  { href: '/schedule',  emoji: '📅', title: 'Schedule',  gradient: 'from-[rgb(217,138,148)] to-[rgb(167,120,160)]' },
  { href: '/journal',   emoji: '📓', title: 'Journal',   gradient: 'from-[rgb(220,161,84)] to-[rgb(217,138,148)]' },
  { href: '/food',      emoji: '🗺️', title: 'Food Map',  gradient: 'from-[rgb(232,120,90)] to-[rgb(217,138,148)]' },
  { href: '/personal',  emoji: '🗂️', title: 'Personal',  gradient: 'from-[rgb(167,120,160)] to-[rgb(220,161,84)]' },
  { href: '/watchlist', emoji: '🎬', title: 'Watchlist', gradient: 'from-[rgb(217,138,148)] to-[rgb(232,120,90)]' },
]

// Training plan by day of week (1=Mon … 7=Sun)
const DAY_PLAN: Record<number, { activity: string; emoji: string }> = {
  1: { activity: 'PT Session',  emoji: '🏋️' },
  2: { activity: 'Bike Ride',   emoji: '🚴' },
  3: { activity: 'PT Session',  emoji: '🏋️' },
  4: { activity: 'Active Rest', emoji: '🧘' },
  5: { activity: 'PT Session',  emoji: '🏋️' },
  6: { activity: 'Long Ride',   emoji: '🚴' },
  7: { activity: 'Full Rest',   emoji: '😴' },
}

/** Apple-Watch-style progress ring, warm-toned */
function ActivityRing({ completed, total }: { completed: number; total: number }) {
  const pct = total > 0 ? Math.min(completed / total, 1) : 0
  const R = 34, C = 2 * Math.PI * R
  return (
    <div className="relative w-[88px] h-[88px]">
      <svg viewBox="0 0 88 88" className="w-full h-full -rotate-90">
        <circle cx="44" cy="44" r={R} fill="none" strokeWidth="9" stroke="rgb(var(--canvas-alt))" />
        <circle cx="44" cy="44" r={R} fill="none" strokeWidth="9" strokeLinecap="round"
          stroke="url(#ringGrad)"
          strokeDasharray={C} strokeDashoffset={C * (1 - pct)}
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.25, 0.1, 0.25, 1)' }} />
        <defs>
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgb(232,120,90)" />
            <stop offset="100%" stopColor="rgb(220,161,84)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold text-ink leading-none">
          {completed}<span className="text-xs font-medium text-ink/40">/{total}</span>
        </span>
      </div>
    </div>
  )
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export default function HomePage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [name, setName] = useState('')
  const [nudges, setNudges] = useState<Nudge[]>([])
  const [mascotMood, setMascotMood] = useState<MascotMood>('content')
  const today = new Date()
  const dateStr = today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
  const todayDow = today.getDay() || 7
  const plan = DAY_PLAN[todayDow]

  useEffect(() => {
    fetch('/api/dashboard').then(r => r.json()).then(setData).catch(() => {})
    fetch('/api/life/nudges').then(r => r.json()).then(d => {
      setNudges(d.nudges ?? [])
      setMascotMood(d.nudges?.length ? 'curious' : 'pleased')
    }).catch(() => {})
    setName(localStorage.getItem('userName') ?? '')
  }, [])

  const topNudge = nudges[0]

  return (
    <div className="relative flex min-h-screen bg-canvas dark:bg-canvas">
      <Ambient glow="232 120 90" />
      <ModuleDock />
      <div className="relative z-10 flex-1 min-w-0">
        {/* Large-title header */}
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

          {/* ── Companion nudge ── */}
          <div className="bg-surface/90 dark:bg-surface/70 rounded-3xl border border-black/5 dark:border-white/5 shadow-sm px-5 py-4 flex items-center gap-4">
            <Mascot mood={mascotMood} size={52} className="mascot-pop shrink-0" />
            <div className="flex-1 min-w-0">
              {topNudge ? (
                <>
                  <p className="text-sm font-semibold text-ink leading-snug">{topNudge.message}</p>
                  <Link href={topNudge.href} className="text-xs font-bold text-[rgb(var(--coral))] hover:underline mt-0.5 inline-block">
                    Take care of it →
                  </Link>
                </>
              ) : (
                <p className="text-sm font-semibold text-ink leading-snug">All caught up — nothing needs you right now.</p>
              )}
            </div>
          </div>

          {/* ── Widgets row ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

            {/* Habits ring widget */}
            <Link href="/life"
              className="bg-surface/90 dark:bg-surface/70 rounded-3xl p-4 border border-black/5 dark:border-white/5 shadow-sm hover:shadow-md active:scale-[0.98] transition-all duration-300 ease-apple flex flex-col items-center justify-center gap-2">
              {data ? (
                <ActivityRing completed={data.life.habitsCompletedToday} total={data.life.habitsScheduledToday} />
              ) : (
                <div className="w-[88px] h-[88px] rounded-full bg-canvas-alt animate-pulse" />
              )}
              <span className="text-xs font-semibold text-ink/50">Habits today</span>
            </Link>

            {/* Balance widget */}
            <Link href="/finance"
              className="bg-surface/90 dark:bg-surface/70 rounded-3xl p-4 border border-black/5 dark:border-white/5 shadow-sm hover:shadow-md active:scale-[0.98] transition-all duration-300 ease-apple flex flex-col justify-between min-h-[140px]">
              <span className="text-xl">💰</span>
              <div>
                <p className="text-[10px] font-semibold tracking-wide text-ink/40 uppercase mb-0.5">Total balance</p>
                {data ? (
                  <p className="text-xl font-black text-ink leading-tight tracking-tight">{formatEUR(data.finance.totalBalanceEUR)}</p>
                ) : (
                  <div className="h-6 w-24 bg-canvas-alt rounded animate-pulse" />
                )}
              </div>
            </Link>

            {/* Month flow widget */}
            <Link href="/finance/insights"
              className="bg-surface/90 dark:bg-surface/70 rounded-3xl p-4 border border-black/5 dark:border-white/5 shadow-sm hover:shadow-md active:scale-[0.98] transition-all duration-300 ease-apple flex flex-col justify-between min-h-[140px]">
              <span className="text-xl">📊</span>
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold tracking-wide text-ink/40 uppercase">This month</p>
                {data ? (
                  <>
                    <p className="flex items-center gap-1.5 text-xs text-ink/70">
                      <TrendingUp size={12} className="text-emerald-500 shrink-0" />
                      <span className="truncate font-medium">{formatRSD(data.finance.incomeThisMonthRSD)}</span>
                    </p>
                    <p className="flex items-center gap-1.5 text-xs text-ink/70">
                      <TrendingDown size={12} className="text-[rgb(var(--coral))] shrink-0" />
                      <span className="truncate font-medium">{formatRSD(data.finance.expensesThisMonthRSD)}</span>
                    </p>
                  </>
                ) : (
                  <div className="h-8 w-20 bg-canvas-alt rounded animate-pulse" />
                )}
              </div>
            </Link>

            {/* Today's training widget */}
            <Link href="/fitness"
              className="bg-surface/90 dark:bg-surface/70 rounded-3xl p-4 border border-black/5 dark:border-white/5 shadow-sm hover:shadow-md active:scale-[0.98] transition-all duration-300 ease-apple flex flex-col justify-between min-h-[140px]">
              <span className="text-xl">{plan.emoji}</span>
              <div>
                <p className="text-[10px] font-semibold tracking-wide text-ink/40 uppercase mb-0.5">Today's training</p>
                <p className="text-base font-bold text-ink leading-tight">{plan.activity}</p>
                <p className="text-[11px] text-ink/40 mt-0.5 flex items-center gap-0.5">Open Fitness <ChevronRight size={10} /></p>
              </div>
            </Link>
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
                  <span className={`flex items-center justify-center w-[60px] h-[60px] rounded-[18px] bg-gradient-to-br ${m.gradient} text-[28px] shadow-md shadow-black/10 group-hover:scale-105 group-active:scale-95 transition-transform duration-300 ease-apple`}>
                    {m.emoji}
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
