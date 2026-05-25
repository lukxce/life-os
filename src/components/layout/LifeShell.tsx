'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { SlidersHorizontal } from 'lucide-react'
import { LifeSidebar } from './LifeSidebar'
import { LifeBottomNav } from './LifeBottomNav'
import { QuickAddSheet } from './QuickAddSheet'
import { ThemeToggle } from './ThemeToggle'

export function LifeShell({ children }: { children: React.ReactNode }) {
  const [showAdd, setShowAdd] = useState(false)
  const router = useRouter()

  return (
    <div className="flex min-h-screen bg-white dark:bg-gray-950">
      <LifeSidebar onAdd={() => setShowAdd(true)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        <header className="md:hidden bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 py-3 flex items-center justify-between">
          <span className="font-bold text-gray-900 dark:text-white text-lg">✅ Life</span>
          <div className="flex items-center gap-2">
            <Link href="/life/settings" className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <SlidersHorizontal size={18} />
            </Link>
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          <div className="max-w-2xl mx-auto px-4 py-6 md:py-8 pb-28 md:pb-8">
            {children}
          </div>
        </main>
      </div>

      <LifeBottomNav onAdd={() => setShowAdd(true)} />

      {showAdd && (
        <QuickAddSheet onClose={() => setShowAdd(false)} onCreated={() => router.refresh()} />
      )}
    </div>
  )
}
