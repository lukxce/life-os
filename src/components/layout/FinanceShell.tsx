'use client'
import Link from 'next/link'
import { FinanceSidebar } from './FinanceSidebar'
import { FinanceBottomNav } from './FinanceBottomNav'
import { Toaster } from 'sonner'
import { GlobalSearch } from './GlobalSearch'
import { ThemeToggle } from './ThemeToggle'
import { SlidersHorizontal } from 'lucide-react'

export function FinanceShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-800">
      <div className="hidden md:block">
        <FinanceSidebar open={true} onClose={() => {}} />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="md:hidden bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
          <span className="font-bold text-gray-900 dark:text-white text-lg">💰 Finance</span>
          <div className="flex items-center gap-1">
            <GlobalSearch mobileIconOnly />
            <ThemeToggle />
            <Link href="/finance/settings" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              <SlidersHorizontal size={20} className="text-gray-600 dark:text-gray-300" />
            </Link>
          </div>
        </header>

        <header className="hidden md:flex items-center justify-end px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 gap-2">
          <GlobalSearch />
          <ThemeToggle />
          <Link href="/finance/settings" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" title="Settings">
            <SlidersHorizontal size={18} className="text-gray-600 dark:text-gray-300" />
          </Link>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-6 pb-24 md:pb-6">
          {children}
        </main>
      </div>

      <div className="md:hidden">
        <FinanceBottomNav />
      </div>

      <Toaster position="top-right" richColors />
      <GlobalSearch keyboardOnly />
    </div>
  )
}
