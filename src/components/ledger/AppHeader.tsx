'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { GlobalSearch } from '@/components/layout/GlobalSearch'
import { QuickMenu, QuickAction } from './QuickMenu'

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

/** Fixed (not sticky — an overflow-x:hidden ancestor silently breaks sticky)
 *  header used on every page: wordmark, search, theme, "+ New" on desktop.
 *  The module row underneath replaces the old ModuleDock + mobile Apps
 *  sheet with one cross-module nav that works identically on both. */
export function AppHeader({ actions }: { actions: QuickAction[] }) {
  const [newOpen, setNewOpen] = useState(false)
  const path = usePathname()

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-ldg-paper/90 dark:bg-ldg-paper/90 backdrop-blur-xl border-b border-ldg-ink/10">
      <div className="max-w-5xl mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between py-2.5">
          <Link href="/" className="font-mono text-[12px] font-bold uppercase tracking-[0.2em] text-ldg-ink">
            Life OS
          </Link>
          <div className="flex items-center gap-1.5">
            <GlobalSearch mobileIconOnly />
            <ThemeToggle />
            {actions.length > 0 && (
              <div className="relative hidden md:block">
                <button onClick={() => setNewOpen(o => !o)}
                  className={cn('flex items-center gap-1.5 text-[13px] font-semibold pl-3 pr-3.5 py-1.5 rounded-lg active:scale-95 transition-transform',
                    newOpen ? 'bg-ldg-ink text-ldg-paper' : 'bg-ldg-green text-white')}>
                  {newOpen ? <X size={14} /> : <Plus size={14} />} New
                </button>
                {newOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setNewOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 z-50">
                      <QuickMenu actions={actions} onClose={() => setNewOpen(false)} />
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
        <nav className="flex gap-5 overflow-x-auto pb-2.5" style={{ scrollbarWidth: 'none' }}>
          {NAV.map(n => {
            const active = path === n.href || path.startsWith(n.href + '/')
            return (
              <Link key={n.href} href={n.href}
                className={cn('text-[13px] font-medium whitespace-nowrap transition-colors',
                  active ? 'text-ldg-green font-semibold' : 'text-ldg-ink/55 hover:text-ldg-ink/80')}>
                {n.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}

/** Fixed-header spacer — keeps content from sliding under the bar */
export function AppHeaderSpacer() {
  return <div className="h-[78px]" />
}
