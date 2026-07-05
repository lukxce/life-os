'use client'
import { ModuleDock } from './ModuleDock'
import { useEffect, useState } from 'react'
import { PersonalSidebar } from './PersonalSidebar'
import { PersonalBottomNav } from './PersonalBottomNav'
import { GlobalSearch } from './GlobalSearch'
import { ThemeToggle } from './ThemeToggle'
import { Toaster } from 'sonner'

export function PersonalShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    setCollapsed(localStorage.getItem('sidebar-personal-collapsed') === 'true')
  }, [])

  const toggle = () => setCollapsed(v => {
    localStorage.setItem('sidebar-personal-collapsed', String(!v))
    return !v
  })

  return (
    <div className="flex min-h-screen bg-[#f5f5f7] dark:bg-gray-950">
      <ModuleDock />
      <PersonalSidebar collapsed={collapsed} onToggle={toggle} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="md:hidden sticky top-0 z-30 bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border-b border-black/5 dark:border-white/5 px-4 py-3 flex items-center justify-between shrink-0">
          <span className="font-bold text-gray-900 dark:text-white text-lg">🗂️ Personal</span>
          <div className="flex items-center gap-2">
            <GlobalSearch mobileIconOnly />
            <ThemeToggle />
          </div>
        </header>

        {/* Desktop header */}
        <header className="hidden md:flex items-center justify-end px-6 py-3 sticky top-0 z-30 bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border-b border-black/5 dark:border-white/5 gap-2 shrink-0">
          <GlobalSearch />
          <ThemeToggle />
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-8 pb-24 md:pb-8">
          {children}
        </main>
      </div>

      <div className="md:hidden">
        <PersonalBottomNav />
      </div>

      <Toaster position="top-right" richColors />
      <GlobalSearch keyboardOnly />
    </div>
  )
}
