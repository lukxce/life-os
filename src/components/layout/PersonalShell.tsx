'use client'
import { PersonalSidebar } from './PersonalSidebar'
import { PersonalBottomNav } from './PersonalBottomNav'
import { GlobalSearch } from './GlobalSearch'
import { ThemeToggle } from './ThemeToggle'
import { Toaster } from 'sonner'

export function PersonalShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      <PersonalSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 py-3 flex items-center justify-between shrink-0">
          <span className="font-bold text-gray-900 dark:text-white text-lg">🗂️ Personal</span>
          <div className="flex items-center gap-2">
            <GlobalSearch mobileIconOnly />
            <ThemeToggle />
          </div>
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
