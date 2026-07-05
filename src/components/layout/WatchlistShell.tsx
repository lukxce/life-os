'use client'
import { AppShell, ModuleConfig } from './AppShell'
import { Tv, BookOpen } from 'lucide-react'

const config: ModuleConfig = {
  name: 'Watchlist',
  emoji: '🎬',
  home: '/watchlist',
  accentActive: 'bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  accentText: 'text-violet-600 dark:text-violet-400',
  accentFab: 'bg-violet-600 hover:bg-violet-700',
  contentClassName: 'max-w-5xl',
  groups: [
    { items: [
      { href: '/watchlist', label: 'Movies & TV', icon: Tv },
      { href: '/books',     label: 'Books',       icon: BookOpen },
    ]},
  ],
  tabs: [
    { href: '/watchlist', label: 'Movies & TV', icon: Tv },
    { href: '/books',     label: 'Books',       icon: BookOpen },
  ],
}

export function WatchlistShell({ children }: { children: React.ReactNode }) {
  return <AppShell config={config}>{children}</AppShell>
}
