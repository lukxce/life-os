'use client'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { formatEUR, formatRSD } from '@/lib/utils'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { GlobalSearch } from '@/components/layout/GlobalSearch'
import {
  TrendingUp, TrendingDown, CheckCircle2, Circle, FileText,
  ArrowRight, Wallet, Sparkles
} from 'lucide-react'

const FoodMapPreview = dynamic(
  () => import('@/components/food/FoodMapPreview').then(m => m.FoodMapPreview),
  { ssr: false, loading: () => <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" /> }
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

const MODULES = [
  {
    href: '/finance',
    emoji: '💰',
    title: 'Finance',
    description: 'Income, expenses, accounts & planning',
    color: 'from-blue-500 to-blue-600',
    border: 'border-blue-100 dark:border-blue-900',
    bg: 'bg-blue-50 dark:bg-blue-950/40',
  },
  {
    href: '/life',
    emoji: '💪',
    title: 'Habits & Fitness',
    description: 'Habits, body & goals',
    color: 'from-indigo-500 to-indigo-600',
    border: 'border-indigo-100 dark:border-indigo-900',
    bg: 'bg-indigo-50 dark:bg-indigo-950/40',
  },
  {
    href: '/schedule',
    emoji: '📅',
    title: 'Schedule',
    description: 'Calendar, people & planning',
    color: 'from-sky-500 to-sky-600',
    border: 'border-sky-100 dark:border-sky-900',
    bg: 'bg-sky-50 dark:bg-sky-950/40',
  },
  {
    href: '/journal',
    emoji: '📓',
    title: 'Journal',
    description: 'Weekly reflections & notes',
    color: 'from-amber-500 to-amber-600',
    border: 'border-amber-100 dark:border-amber-900',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
  },
  {
    href: '/food',
    emoji: '🗺️',
    title: 'Food Map',
    description: 'Restaurants & places you love',
    color: 'from-orange-400 to-orange-500',
    border: 'border-orange-100 dark:border-orange-900',
    bg: 'bg-orange-50 dark:bg-orange-950/40',
  },
  {
    href: '/watchlist',
    emoji: '🎬',
    title: 'Watchlist',
    description: 'Movies, TV shows & books',
    color: 'from-violet-500 to-violet-600',
    border: 'border-violet-100 dark:border-violet-900',
    bg: 'bg-violet-50 dark:bg-violet-950/40',
  },
]

export default function HomePage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const today = new Date()
  const dateStr = today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

  useEffect(() => {
    fetch('/api/dashboard').then(r => r.json()).then(setData).catch(() => {})
  }, [])

  const habitProgress = data
    ? data.life.habitsScheduledToday > 0
      ? Math.round((data.life.habitsCompletedToday / data.life.habitsScheduledToday) * 100)
      : 0
    : null

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Top bar */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Life OS</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{dateStr}</p>
        </div>
        {/* Mobile: icon-only search · iPad/desktop: full search bar */}
        <div className="flex items-center gap-2">
          <div className="md:hidden flex items-center gap-2">
            <GlobalSearch mobileIconOnly />
            <ThemeToggle />
          </div>
          <div className="hidden md:flex items-center gap-2">
            <GlobalSearch />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">

        {/* Snapshot row */}
        {data && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Balance */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
              <p className="text-xs text-gray-400 dark:text-gray-500 font-medium uppercase mb-1 flex items-center gap-1.5">
                <Wallet size={12} /> Total Balance
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatEUR(data.finance.totalBalanceEUR)}</p>
            </div>

            {/* This month */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
              <p className="text-xs text-gray-400 dark:text-gray-500 font-medium uppercase mb-2">This month</p>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm">
                  <TrendingUp size={14} className="text-green-500 shrink-0" />
                  <span className="text-gray-600 dark:text-gray-300 truncate">{formatRSD(data.finance.incomeThisMonthRSD)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <TrendingDown size={14} className="text-red-500 shrink-0" />
                  <span className="text-gray-600 dark:text-gray-300 truncate">{formatRSD(data.finance.expensesThisMonthRSD)}</span>
                </div>
              </div>
            </div>

            {/* Habits today */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
              <p className="text-xs text-gray-400 dark:text-gray-500 font-medium uppercase mb-1 flex items-center gap-1.5">
                <Sparkles size={12} /> Habits today
              </p>
              {data.life.habitsScheduledToday > 0 ? (
                <>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {data.life.habitsCompletedToday}
                    <span className="text-base font-normal text-gray-400 dark:text-gray-500"> / {data.life.habitsScheduledToday}</span>
                  </p>
                  <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                    <div
                      className="bg-indigo-500 h-1.5 rounded-full transition-all"
                      style={{ width: `${habitProgress}%` }}
                    />
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">No habits scheduled</p>
              )}
            </div>
          </div>
        )}

        {/* Upcoming bills */}
        {data && data.finance.upcomingBills.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <FileText size={16} className="text-gray-400" /> Upcoming Bills
              </h2>
              <Link href="/finance/bills" className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                View all <ArrowRight size={11} />
              </Link>
            </div>
            <div className="divide-y divide-gray-50 dark:divide-gray-700">
              {data.finance.upcomingBills.map(bill => (
                <div key={bill.id} className="px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 dark:text-gray-500 w-6 text-center font-mono">{bill.dayOfMonth}</span>
                    <span className="text-sm text-gray-700 dark:text-gray-200">{bill.name}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {bill.amount.toLocaleString()} {bill.currency}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Module cards */}
        <div>
          <h2 className="text-sm font-semibold text-gray-400 dark:text-gray-500 uppercase mb-4">Modules</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {MODULES.map(m => (
              <Link key={m.href} href={m.href}
                className={`group rounded-2xl p-6 border ${m.border} ${m.bg} hover:shadow-md transition-all duration-200 flex items-start justify-between`}>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-3xl">{m.emoji}</span>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{m.title}</h3>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{m.description}</p>
                </div>
                <ArrowRight size={18} className="text-gray-300 dark:text-gray-600 group-hover:text-gray-500 dark:group-hover:text-gray-400 shrink-0 mt-1 transition-colors" />
              </Link>
            ))}
          </div>
        </div>

        {/* Food map preview */}
        <div>
          <h2 className="text-sm font-semibold text-gray-400 dark:text-gray-500 uppercase mb-4">Food Map</h2>
          <FoodMapPreview />
        </div>

        {/* Quick actions */}
        <div>
          <h2 className="text-sm font-semibold text-gray-400 dark:text-gray-500 uppercase mb-4">Quick access</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { href: '/life', label: "Today's habits", emoji: '☀️' },
              { href: '/finance/scan', label: 'Scan receipt', emoji: '📷' },
              { href: '/finance/expenses/personal', label: 'Add expense', emoji: '💸' },
              { href: '/schedule', label: 'My schedule', emoji: '📅' },
            ].map(q => (
              <Link key={q.href} href={q.href}
                className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 hover:shadow-sm transition-all text-center">
                <span className="text-2xl mb-2 block">{q.emoji}</span>
                <span className="text-xs font-medium text-gray-600 dark:text-gray-300 leading-tight block">{q.label}</span>
              </Link>
            ))}
          </div>
        </div>

      </main>
      <GlobalSearch keyboardOnly />
    </div>
  )
}
