'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Wallet, Sparkles, Dumbbell, CalendarDays,
  BookOpen, MapPin, FolderLock, Clapperboard,
} from 'lucide-react'

// Persistent module rail — visible on every screen (desktop), like a dock.
// Jump between modules from anywhere without going back home.
const MODULES = [
  { href: '/',          icon: LayoutDashboard, label: 'Dashboard', match: (p: string) => p === '/' },
  { href: '/finance',   icon: Wallet,          label: 'Finance',   match: (p: string) => p.startsWith('/finance'), tint: 'rgb(var(--l-green))' },
  { href: '/life',      icon: Sparkles,        label: 'Habits',    match: (p: string) => p.startsWith('/life'), tint: 'rgb(var(--l-green))' },
  { href: '/fitness',   icon: Dumbbell,        label: 'Fitness',   match: (p: string) => p.startsWith('/fitness'), tint: 'rgb(var(--l-green))' },
  { href: '/schedule',  icon: CalendarDays,    label: 'Schedule',  match: (p: string) => p.startsWith('/schedule'), tint: 'rgb(var(--l-green))' },
  { href: '/journal',   icon: BookOpen,        label: 'Journal',   match: (p: string) => p.startsWith('/journal'), tint: 'rgb(var(--l-green))' },
  { href: '/food',      icon: MapPin,          label: 'Food',      match: (p: string) => p.startsWith('/food'), tint: 'rgb(var(--l-green))' },
  { href: '/personal',  icon: FolderLock,      label: 'Personal',  match: (p: string) => p.startsWith('/personal'), tint: 'rgb(var(--l-green))' },
  { href: '/watchlist', icon: Clapperboard,    label: 'Watchlist', match: (p: string) => p.startsWith('/watchlist') || p.startsWith('/books'), tint: 'rgb(var(--l-green))' },
]

export function ModuleDock() {
  const pathname = usePathname()
  return (
    <aside className="hidden lg:flex flex-col items-center gap-1 w-[68px] shrink-0 h-screen sticky top-0 py-4 z-40
                      bg-surface/40 dark:bg-white/[0.02] backdrop-blur-2xl border-r border-black/5 dark:border-white/5">
      {MODULES.map(m => {
        const active = m.match(pathname)
        const Icon = m.icon
        return (
          <Link key={m.href} href={m.href} title={m.label}
            className={cn(
              'group relative flex flex-col items-center justify-center w-12 h-12 rounded-2xl transition-all duration-300 ease-apple',
              active
                ? 'bg-surface dark:bg-surface shadow-sm scale-105'
                : 'hover:bg-black/5 dark:hover:bg-white/5 hover:scale-105 active:scale-95',
            )}>
            <Icon size={21} strokeWidth={active ? 2.3 : 1.8}
              style={{ color: active ? (m.tint ?? 'rgb(var(--ink))') : undefined }}
              className={!active ? 'text-ink/50' : undefined} />
            {/* macOS-style active dot */}
            {active && <span className="absolute -bottom-1.5 w-1 h-1 rounded-full" style={{ background: m.tint ?? 'rgb(var(--ink))' }} />}
            {/* Hover label */}
            <span className="pointer-events-none absolute left-full ml-3 px-2.5 py-1 rounded-lg bg-ink/90 text-canvas text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">
              {m.label}
            </span>
          </Link>
        )
      })}
    </aside>
  )
}
