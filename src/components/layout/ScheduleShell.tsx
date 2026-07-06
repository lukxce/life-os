'use client'
import { AppShell, ModuleConfig } from './AppShell'
import { CalendarDays, Settings } from 'lucide-react'

const config: ModuleConfig = {
  name: 'Schedule',
  emoji: '📅',
  home: '/schedule',
  accentActive: 'bg-[rgb(217,138,148)]/10 text-[rgb(217,138,148)] dark:bg-[rgb(217,138,148)]/15 dark:text-[rgb(217,138,148)]',
  accentText: 'text-[rgb(217,138,148)] dark:text-[rgb(217,138,148)]',
  accentFab: 'bg-[rgb(217,138,148)] hover:bg-[rgb(197,118,128)]',
  glow: '217 138 148',
  contentClassName: 'max-w-6xl',
  groups: [
    { items: [
      { href: '/schedule',          label: 'Schedule',  icon: CalendarDays },
      { href: '/schedule/settings', label: 'Calendars', icon: Settings },
    ]},
  ],
  tabs: [
    { href: '/schedule',          label: 'Schedule',  icon: CalendarDays },
    { href: '/schedule/settings', label: 'Calendars', icon: Settings },
  ],
}

export function ScheduleShell({ children }: { children: React.ReactNode }) {
  return <AppShell config={config}>{children}</AppShell>
}
