'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { SlidersHorizontal } from 'lucide-react'
import { LifeSidebar } from './LifeSidebar'
import { LifeBottomNav } from './LifeBottomNav'
import { QuickAddSheet } from './QuickAddSheet'
import { ThemeToggle } from './ThemeToggle'
import { GlobalSearch } from './GlobalSearch'

export function LifeShell({ children }: { children: React.ReactNode }) {
  const [showAdd, setShowAdd] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setCollapsed(localStorage.getItem('sidebar-life-collapsed') === 'true')
  }, [])

  const toggle = () => setCollapsed(v => {
    localStorage.setItem('sidebar-life-collapsed', String(!v))
    return !v
  })

  return (
    <div className="flex min-h-screen bg-[#f5f5f7] dark:bg-gray-950">
      <LifeSidebar onAdd={() => setShowAdd(true)} collapsed={collapsed} onToggle={toggle} />

      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Mobile header */}
        <header className="md:hidden sticky top-0 z-30 bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border-b border-black/5 dark:border-white/5 px-4 py-3 flex items-center justify-between shrink-0">
          <span className="font-bold text-gray-900 dark:text-white text-lg">💪 Habits</span>
          <div className="flex items-center gap-1">
            <GlobalSearch mobileIconOnly />
            <Link href="/life/habits" className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <SlidersHorizontal size={18} />
            </Link>
            <ThemeToggle />
          </div>
        </header>

        {/* Desktop header */}
        <header className="hidden md:flex items-center justify-end px-6 py-3 sticky top-0 z-30 bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border-b border-black/5 dark:border-white/5 gap-2 shrink-0">
          <GlobalSearch />
          <ThemeToggle />
          <Link href="/life/habits" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" title="Manage habits">
            <SlidersHorizontal size={18} className="text-gray-600 dark:text-gray-300" />
          </Link>
        </header>

        <main className="flex-1 overflow-auto">
          <div className="max-w-2xl md:max-w-3xl mx-auto px-4 py-6 md:py-8 pb-28 md:pb-8">
            {children}
          </div>
        </main>
      </div>

      <LifeBottomNav onAdd={() => setShowAdd(true)} />

      {showAdd && (
        <QuickAddSheet onClose={() => setShowAdd(false)} onCreated={() => router.refresh()} />
      )}
      <GlobalSearch keyboardOnly />
    </div>
  )
}
