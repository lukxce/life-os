'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppShell, ModuleConfig } from './AppShell'
import { QuickAddSheet } from './QuickAddSheet'
import { CalendarDays, CalendarCheck, Target, BarChart2, History, ListChecks, Plus, Sparkles } from 'lucide-react'

const baseConfig: Omit<ModuleConfig, 'fab'> = {
  name: 'Habits',
  icon: Sparkles,
  home: '/life',
  accentActive: 'bg-[rgb(var(--l-green))]/10 text-[rgb(var(--l-green))] dark:bg-[rgb(var(--l-green))]/15 dark:text-[rgb(var(--l-green))]',
  accentText: 'text-[rgb(var(--l-green))] dark:text-[rgb(var(--l-green))]',
  accentFab: 'bg-[rgb(var(--l-green))] hover:bg-[rgb(147,100,140)]',
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
