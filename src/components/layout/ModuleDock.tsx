'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

// Persistent module rail — visible on every screen (desktop), like a dock.
// Jump between modules from anywhere without going back home.
const MODULES = [
  { href: '/',          emoji: '🏠', label: 'Home',      match: (p: string) => p === '/' },
  { href: '/finance',   emoji: '💰', label: 'Finance',   match: (p: string) => p.startsWith('/finance') },
  { href: '/life',      emoji: '🧘', label: 'Habits',    match: (p: string) => p.startsWith('/life') },
  { href: '/fitness',   emoji: '💪', label: 'Fitness',   match: (p: string) => p.startsWith('/fitness') },
  { href: '/schedule',  emoji: '📅', label: 'Schedule',  match: (p: string) => p.startsWith('/schedule') },
  { href: '/journal',   emoji: '📓', label: 'Journal',   match: (p: string) => p.startsWith('/journal') },
  { href: '/food',      emoji: '🗺️', label: 'Food',      match: (p: string) => p.startsWith('/food') },
  { href: '/personal',  emoji: '🗂️', label: 'Personal',  match: (p: string) => p.startsWith('/personal') },
  { href: '/watchlist', emoji: '🎬', label: 'Watchlist', match: (p: string) => p.startsWith('/watchlist') || p.startsWith('/books') },
]

export function ModuleDock() {
  const pathname = usePathname()
  return (
    <aside className="hidden lg:flex flex-col items-center gap-1 w-[68px] shrink-0 h-screen sticky top-0 py-4 z-40
                      bg-white/40 dark:bg-white/[0.02] backdrop-blur-2xl border-r border-black/5 dark:border-white/5">
      {MODULES.map(m => {
        const active = m.match(pathname)
        return (
          <Link key={m.href} href={m.href} title={m.label}
            className={cn(
              'group relative flex flex-col items-center justify-center w-12 h-12 rounded-2xl transition-all duration-300 ease-apple',
              active
                ? 'bg-white dark:bg-gray-800 shadow-sm scale-105'
                : 'hover:bg-black/5 dark:hover:bg-white/5 hover:scale-105 active:scale-95',
            )}>
            <span className="text-[22px] leading-none">{m.emoji}</span>
            {/* macOS-style active dot */}
            {active && <span className="absolute -bottom-1.5 w-1 h-1 rounded-full bg-gray-400 dark:bg-gray-500" />}
            {/* Hover label */}
            <span className="pointer-events-none absolute left-full ml-3 px-2.5 py-1 rounded-lg bg-gray-900/90 dark:bg-white/90 text-white dark:text-gray-900 text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">
              {m.label}
            </span>
          </Link>
        )
      })}
    </aside>
  )
}
