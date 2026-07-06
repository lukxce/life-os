'use client'
import { AppShell, ModuleConfig } from './AppShell'
import { BookOpen, Settings } from 'lucide-react'

const config: ModuleConfig = {
  name: 'Journal',
  emoji: '📓',
  home: '/journal',
  accentActive: 'bg-[rgb(232,120,90)]/10 text-[rgb(232,120,90)] dark:bg-[rgb(232,120,90)]/15 dark:text-[rgb(232,120,90)]',
  accentText: 'text-[rgb(232,120,90)] dark:text-[rgb(232,120,90)]',
  accentFab: 'bg-[rgb(232,120,90)] hover:bg-[rgb(212,100,72)]',
  glow: '232 120 90',
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
