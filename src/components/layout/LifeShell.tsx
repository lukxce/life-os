'use client'
import { useState } from 'react'
import { LifeSidebar } from './LifeSidebar'
import { LifeBottomNav } from './LifeBottomNav'
import { QuickAddModal } from '@/components/habits/QuickAddModal'
import { ThemeToggle } from './ThemeToggle'

export function LifeShell({ children }: { children: React.ReactNode }) {
  const [showAdd, setShowAdd] = useState(false)

  return (
    <div className="flex min-h-screen bg-white dark:bg-gray-950">
      <LifeSidebar onAdd={() => setShowAdd(true)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Mobile top bar */}
        <header className="md:hidden bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 py-3 flex items-center justify-between">
          <span className="font-bold text-gray-900 dark:text-white text-lg">✅ Life</span>
          <ThemeToggle />
        </header>

        <main className="flex-1 overflow-auto">
          <div className="max-w-2xl mx-auto px-4 py-6 md:py-8 pb-28 md:pb-8">
            {children}
          </div>
        </main>
      </div>

      <LifeBottomNav onAdd={() => setShowAdd(true)} />

      {showAdd && (
        <QuickAddModal onClose={() => setShowAdd(false)} onCreated={() => window.location.reload()} />
      )}
    </div>
  )
}
