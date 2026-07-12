'use client'
import { AppShell, ModuleConfig } from './AppShell'
import { Tv, BookOpen, Clapperboard } from 'lucide-react'

const config: ModuleConfig = {
  name: 'Watchlist',
  icon: Clapperboard,
  home: '/watchlist',
  accentActive: 'bg-[rgb(var(--l-green))]/10 text-[rgb(var(--l-green))] dark:bg-[rgb(var(--l-green))]/15 dark:text-[rgb(var(--l-green))]',
  accentText: 'text-[rgb(var(--l-green))] dark:text-[rgb(var(--l-green))]',
  accentFab: 'bg-[rgb(var(--l-green))] hover:bg-[rgb(197,118,128)]',
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
