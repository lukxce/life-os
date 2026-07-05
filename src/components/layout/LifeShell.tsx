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
  accentActive: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  accentText: 'text-indigo-600 dark:text-indigo-400',
  accentFab: 'bg-indigo-600 hover:bg-indigo-700',
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
      <AppShell config={{ ...baseConfig, fab: { label: 'Add', icon: Plus, onClick: () => setShowAdd(true) } }}>
        {children}
      </AppShell>
      {showAdd && (
        <QuickAddSheet onClose={() => setShowAdd(false)} onCreated={() => router.refresh()} />
      )}
    </>
  )
}
