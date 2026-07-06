'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppShell, ModuleConfig } from './AppShell'
import { QuickAddSheet } from './QuickAddSheet'
import { CalendarDays, CalendarCheck, Target, BarChart2, History, ListChecks, Plus } from 'lucide-react'

const baseConfig: Omit<ModuleConfig, 'fab'> = {
  name: 'Habits',
  emoji: '🧘',
  home: '/life',
  accentActive: 'bg-[rgb(167,120,160)]/10 text-[rgb(167,120,160)] dark:bg-[rgb(167,120,160)]/15 dark:text-[rgb(167,120,160)]',
  accentText: 'text-[rgb(167,120,160)] dark:text-[rgb(167,120,160)]',
  accentFab: 'bg-[rgb(167,120,160)] hover:bg-[rgb(147,100,140)]',
  glow: '167 120 160',
  contentClassName: 'max-w-2xl md:max-w-3xl',
  groups: [
    { title: 'Daily', items: [
      { href: '/life',        label: 'Today',  icon: CalendarDays },
      { href: '/life/weekly', label: 'Weekly', icon: CalendarCheck },
    ]},
    { title: 'Track', items: [
      { href: '/life/goals', label: 'Goals', icon: Target },
    ]},
    { title: 'Review', items: [
      { href: '/life/analytics', label: 'Analytics', icon: BarChart2 },
      { href: '/life/history',   label: 'History',   icon: History },
    ]},
    { title: 'Manage', items: [
      { href: '/life/habits', label: 'Habits', icon: ListChecks },
    ]},
  ],
  tabs: [
    { href: '/life',        label: 'Today',  icon: CalendarDays },
    { href: '/life/weekly', label: 'Weekly', icon: CalendarCheck },
    { href: '/life/goals',  label: 'Goals',  icon: Target },
  ],
}

export function LifeShell({ children }: { children: React.ReactNode }) {
  const [showAdd, setShowAdd] = useState(false)
  const router = useRouter()

  return (
    <>
      <AppShell config={{ ...baseConfig, actions: [{ label: 'Add habit entry', icon: Plus, onClick: () => setShowAdd(true) }] }}>
        {children}
      </AppShell>
      {showAdd && (
        <QuickAddSheet onClose={() => setShowAdd(false)} onCreated={() => router.refresh()} />
      )}
    </>
  )
}
