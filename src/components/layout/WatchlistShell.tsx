'use client'
import Link from 'next/link'
import { Home } from 'lucide-react'
import { ThemeToggle } from './ThemeToggle'
import { GlobalSearch } from './GlobalSearch'

export function WatchlistShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <Home size={17} />
          </Link>
          <span className="font-bold text-gray-900 dark:text-white text-lg">🎬 Watchlist</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="md:hidden"><GlobalSearch mobileIconOnly /></div>
          <div className="hidden md:block"><GlobalSearch /></div>
          <ThemeToggle />
        </div>
      </header>

      {/* Wider on iPad/desktop — max-w-2xl is very narrow on a 1024px screen */}
      <main className="max-w-5xl mx-auto px-4 md:px-6 py-6 pb-16">
        {children}
      </main>

      <GlobalSearch keyboardOnly />
    </div>
  )
}
