'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Settings } from 'lucide-react'
import { ScheduleSidebar } from './ScheduleSidebar'
import { ScheduleBottomNav } from './ScheduleBottomNav'
import { GlobalSearch } from './GlobalSearch'
import { ThemeToggle } from './ThemeToggle'

export function ScheduleShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    setCollapsed(localStorage.getItem('sidebar-schedule-collapsed') === 'true')
  }, [])

  const toggle = () => setCollapsed(v => {
    localStorage.setItem('sidebar-schedule-collapsed', String(!v))
    return !v
  })

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      <ScheduleSidebar collapsed={collapsed} onToggle={toggle} />

      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Mobile header */}
        <header className="md:hidden sticky top-0 z-30 bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border-b border-black/5 dark:border-white/5 px-4 py-3 flex items-center justify-between shrink-0">
          <span className="font-bold text-gray-900 dark:text-white text-lg">📅 Schedule</span>
          <div className="flex items-center gap-2">
            <GlobalSearch mobileIconOnly />
            <ThemeToggle />
            <Link href="/schedule/settings" className="p-2 rounded-xl text-gray-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" title="Calendar settings">
              <Settings size={16} />
            </Link>
          </div>
        </header>

        {/* Desktop header */}
        <header className="hidden md:flex items-center justify-end px-6 py-3 sticky top-0 z-30 bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border-b border-black/5 dark:border-white/5 gap-2 shrink-0">
          <GlobalSearch />
          <ThemeToggle />
          <Link href="/schedule/settings" className="p-2 rounded-xl text-gray-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" title="Calendar settings">
            <Settings size={16} />
          </Link>
        </header>

        <main className="flex-1 overflow-auto pb-24 md:pb-0">
          {children}
        </main>
      </div>

      <div className="md:hidden">
        <ScheduleBottomNav />
      </div>

      <GlobalSearch keyboardOnly />
    </div>
  )
}
