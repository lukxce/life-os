'use client'
import { AppShell, ModuleConfig } from './AppShell'
import { BookOpen, Settings } from 'lucide-react'

const config: ModuleConfig = {
  name: 'Journal',
  emoji: '📓',
  home: '/journal',
  accentActive: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  accentText: 'text-amber-600 dark:text-amber-400',
  accentFab: 'bg-amber-500 hover:bg-amber-600',
  glow: '245 158 11',
  groups: [
    { items: [
      { href: '/journal',          label: 'Journal',   icon: BookOpen },
      { href: '/journal/settings', label: 'Questions', icon: Settings },
    ]},
  ],
  tabs: [
    { href: '/journal',          label: 'Journal',   icon: BookOpen },
    { href: '/journal/settings', label: 'Questions', icon: Settings },
  ],
}

export function JournalShell({ children }: { children: React.ReactNode }) {
  return <AppShell config={config}>{children}</AppShell>
}
