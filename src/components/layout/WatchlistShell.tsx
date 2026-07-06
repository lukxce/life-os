'use client'
import { AppShell, ModuleConfig } from './AppShell'
import { Tv, BookOpen, Clapperboard } from 'lucide-react'

const config: ModuleConfig = {
  name: 'Watchlist',
  icon: Clapperboard,
  home: '/watchlist',
  accentActive: 'bg-[rgb(217,138,148)]/10 text-[rgb(217,138,148)] dark:bg-[rgb(217,138,148)]/15 dark:text-[rgb(217,138,148)]',
  accentText: 'text-[rgb(217,138,148)] dark:text-[rgb(217,138,148)]',
  accentFab: 'bg-[rgb(217,138,148)] hover:bg-[rgb(197,118,128)]',
  glow: '217 138 148',
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
