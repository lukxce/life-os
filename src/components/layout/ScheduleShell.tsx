'use client'
import { AppShell, ModuleConfig } from './AppShell'
import { CalendarDays, Settings } from 'lucide-react'

const config: ModuleConfig = {
  name: 'Schedule',
  emoji: '📅',
  home: '/schedule',
  accentActive: 'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  accentText: 'text-sky-600 dark:text-sky-400',
  accentFab: 'bg-sky-600 hover:bg-sky-700',
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
