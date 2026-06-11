'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Home, Menu } from 'lucide-react'
import { ThemeToggle } from './ThemeToggle'
import { GlobalSearch } from './GlobalSearch'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

function WatchlistSidebar({ collapsed = false, onToggle }: { collapsed?: boolean; onToggle?: () => void }) {
  const pathname = usePathname()
  return (
    <aside className={cn(
      'hidden md:flex flex-col h-screen sticky top-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 transition-all duration-200',
      collapsed ? 'w-14' : 'w-56',
    )}>
      <div className={cn('flex items-center px-3 pt-4 pb-2', collapsed ? 'flex-col gap-2' : 'justify-between')}>
        {!collapsed && (
          <div className="flex items-center gap-2">
            <span className="text-xl">🎬</span>
            <span className="font-bold text-sm dark:text-white">Watchlist</span>
          </div>
        )}
        {collapsed && <span className="text-xl">🎬</span>}
        <button onClick={onToggle}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0">
          <Menu size={16} />
        </button>
      </div>

      {!collapsed && (
        <Link href="/" className="flex items-center gap-1.5 px-4 mb-3 text-xs text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
          <Home size={11} /> Life OS
        </Link>
      )}

      <nav className={cn('flex flex-col flex-1 overflow-y-auto', collapsed ? 'px-1.5 gap-0.5 py-2' : 'px-3 gap-0.5 py-1')}>
        {[{ href: '/watchlist', label: 'Watchlist', icon: '🎬' }].map(({ href, label, icon }) => {
          const active = pathname === href
          return (
            <Link key={href} href={href} title={collapsed ? label : undefined}
              className={cn(
                'flex items-center rounded-xl text-sm font-medium transition-colors',
                collapsed ? 'justify-center py-2.5 px-2' : 'gap-3 px-3 py-2',
                active ? 'bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400'
                       : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800',
              )}>
              <span className="text-base">{icon}</span>
              {!collapsed && label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}

export function WatchlistShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    setCollapsed(localStorage.getItem('sidebar-watchlist-collapsed') === 'true')
  }, [])

  const toggle = () => setCollapsed(v => {
    localStorage.setItem('sidebar-watchlist-collapsed', String(!v))
    return !v
  })

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      <WatchlistSidebar collapsed={collapsed} onToggle={toggle} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="md:hidden bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 py-3 flex items-center justify-between shrink-0 sticky top-0 z-30">
          <span className="font-bold text-gray-900 dark:text-white text-lg">🎬 Watchlist</span>
          <div className="flex items-center gap-2">
            <GlobalSearch mobileIconOnly />
            <ThemeToggle />
          </div>
        </header>

        {/* Desktop header */}
        <header className="hidden md:flex items-center justify-end px-6 py-3 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 gap-2 shrink-0 sticky top-0 z-30">
          <GlobalSearch />
          <ThemeToggle />
        </header>

        <main className="max-w-5xl mx-auto w-full px-4 md:px-6 py-6 pb-16">
          {children}
        </main>
      </div>

      <GlobalSearch keyboardOnly />
    </div>
  )
}
