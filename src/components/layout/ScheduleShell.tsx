'use client'
import { AppShell, ModuleConfig } from './AppShell'
import { CalendarDays, Settings } from 'lucide-react'

const config: ModuleConfig = {
  name: 'Schedule',
  icon: CalendarDays,
  home: '/schedule',
  accentActive: 'bg-[rgb(var(--l-green))]/10 text-[rgb(var(--l-green))] dark:bg-[rgb(var(--l-green))]/15 dark:text-[rgb(var(--l-green))]',
  accentText: 'text-[rgb(var(--l-green))] dark:text-[rgb(var(--l-green))]',
  accentFab: 'bg-[rgb(var(--l-green))] hover:bg-[rgb(197,118,128)]',
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
