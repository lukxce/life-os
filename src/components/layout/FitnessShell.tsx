'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ThemeToggle } from './ThemeToggle'
import { GlobalSearch } from './GlobalSearch'
import { Dumbbell, Scale, UtensilsCrossed, LayoutDashboard } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/fitness',           label: 'Today',     icon: LayoutDashboard },
  { href: '/fitness/meal-plan', label: 'Meal Plan', icon: UtensilsCrossed },
  { href: '/fitness/body',      label: 'Body',      icon: Scale           },
  { href: '/fitness/workouts',  label: 'Workouts',  icon: Dumbbell        },
]

function Sidebar() {
  const path = usePathname()
  return (
    <aside className="hidden md:flex flex-col w-52 shrink-0 border-r border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 h-screen sticky top-0">
      <div className="px-5 py-5 border-b border-gray-100 dark:border-gray-800">
        <Link href="/" className="text-xs text-gray-400 hover:text-blue-500 transition-colors">← Home</Link>
        <div className="flex items-center gap-2 mt-2">
          <Dumbbell size={20} className="text-green-600" />
          <span className="font-bold text-gray-900 dark:text-white text-lg">Fitness</span>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = path === href
          return (
            <Link key={href} href={href}
              className={cn('flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors',
                active ? 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300'
                       : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800')}>
              <Icon size={16} />
              {label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}

function BottomNav() {
  const path = usePathname()
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
      <div className="flex items-center">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}
            className={cn('flex-1 flex flex-col items-center gap-0.5 py-3 text-xs font-medium transition-colors',
              path === href ? 'text-green-600' : 'text-gray-400 dark:text-gray-500')}>
            <Icon size={22} />
            <span className="text-[10px]">{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}

export function FitnessShell({ children }: { children: React.ReactNode }) {
  const path = usePathname()
  const pageLabel = NAV.find(n => n.href === path)?.label ?? 'Fitness'
  return (
    <div className="flex min-h-screen bg-white dark:bg-gray-950">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Dumbbell size={18} className="text-green-600" />
            <span className="font-bold text-gray-900 dark:text-white">{pageLabel}</span>
          </div>
          <div className="flex items-center gap-1">
            <GlobalSearch mobileIconOnly />
            <ThemeToggle />
          </div>
        </header>
        <header className="hidden md:flex items-center justify-end px-6 py-3 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 gap-2 shrink-0">
          <GlobalSearch />
          <ThemeToggle />
        </header>
        <main className="flex-1 overflow-auto">
          <div className="max-w-3xl mx-auto px-4 py-6 pb-28 md:pb-8">
            {children}
          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  )
}
