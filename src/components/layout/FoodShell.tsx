'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FoodSidebar } from './FoodSidebar'
import { FoodBottomNav } from './FoodBottomNav'
import { ThemeToggle } from './ThemeToggle'
import { PlaceFormSheet } from '@/components/food/PlaceFormSheet'
import { GlobalSearch } from './GlobalSearch'

export function FoodShell({ children }: { children: React.ReactNode }) {
  const [showAdd, setShowAdd] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setCollapsed(localStorage.getItem('sidebar-food-collapsed') === 'true')
  }, [])

  const toggle = () => setCollapsed(v => {
    localStorage.setItem('sidebar-food-collapsed', String(!v))
    return !v
  })

  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-gray-950">
      <FoodSidebar onAdd={() => setShowAdd(true)} collapsed={collapsed} onToggle={toggle} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <header className="md:hidden sticky top-0 z-30 bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border-b border-black/5 dark:border-white/5 px-4 py-3 flex items-center justify-between shrink-0">
          <span className="font-bold text-gray-900 dark:text-white text-lg">🗺️ Food Map</span>
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

        <main className="flex-1 overflow-hidden relative">
          {children}
        </main>
      </div>

      <FoodBottomNav onAdd={() => setShowAdd(true)} />

      {showAdd && (
        <PlaceFormSheet
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); router.refresh() }}
        />
      )}
      <GlobalSearch keyboardOnly />
    </div>
  )
}
