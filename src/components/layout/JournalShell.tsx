'use client'
import { AppShell, ModuleConfig } from './AppShell'
import { BookOpen, Settings } from 'lucide-react'

const config: ModuleConfig = {
  name: 'Journal',
  icon: BookOpen,
  home: '/journal',
  accentActive: 'bg-[rgb(var(--l-green))]/10 text-[rgb(var(--l-green))] dark:bg-[rgb(var(--l-green))]/15 dark:text-[rgb(var(--l-green))]',
  accentText: 'text-[rgb(var(--l-green))] dark:text-[rgb(var(--l-green))]',
  accentFab: 'bg-[rgb(var(--l-green))] hover:bg-[rgb(var(--l-green))]',
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
