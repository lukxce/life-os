'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FoodSidebar } from './FoodSidebar'
import { FoodBottomNav } from './FoodBottomNav'
import { ThemeToggle } from './ThemeToggle'
import { PlaceFormSheet } from '@/components/food/PlaceFormSheet'

export function FoodShell({ children }: { children: React.ReactNode }) {
  const [showAdd, setShowAdd] = useState(false)
  const router = useRouter()

  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-gray-950">
      <FoodSidebar onAdd={() => setShowAdd(true)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="md:hidden bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 py-3 flex items-center justify-between shrink-0">
          <span className="font-bold text-gray-900 dark:text-white text-lg">🗺️ Food Map</span>
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
    </div>
  )
}
