'use client'
import { AppShell, ModuleConfig } from './AppShell'
import { LayoutDashboard, UtensilsCrossed, Scale, Dumbbell, HeartPulse, NotebookPen } from 'lucide-react'

const config: ModuleConfig = {
  name: 'Fitness',
  icon: Dumbbell,
  home: '/fitness',
  accentActive: 'bg-[rgb(var(--l-green))]/10 text-[rgb(var(--l-green))] dark:bg-[rgb(var(--l-green))]/15 dark:text-[rgb(var(--l-green))]',
  accentText: 'text-[rgb(var(--l-green))] dark:text-[rgb(var(--l-green))]',
  accentFab: 'bg-[rgb(var(--l-green))] hover:bg-[rgb(var(--l-green))]',
  glow: '220 161 84',
  groups: [
    { items: [
      { href: '/fitness',           label: 'Today',     icon: LayoutDashboard },
      { href: '/fitness/vitals',    label: 'Vitals',    icon: HeartPulse },
      { href: '/fitness/meal-plan', label: 'Meal Plan', icon: UtensilsCrossed },
      { href: '/fitness/body',      label: 'Body',      icon: Scale },
      { href: '/fitness/workouts',  label: 'Workouts',  icon: Dumbbell },
      { href: '/life/day-log',      label: 'Day Log',   icon: NotebookPen },
    ]},
  ],
  tabs: [
    { href: '/fitness',           label: 'Today',     icon: LayoutDashboard },
    { href: '/fitness/meal-plan', label: 'Meals',     icon: UtensilsCrossed },
    { href: '/fitness/workouts',  label: 'Workouts',  icon: Dumbbell },
  ],
  actions: [
    { label: 'Log weight',  icon: Scale,    href: '/fitness/body' },
    { label: 'Log workout', icon: Dumbbell, href: '/fitness/workouts' },
  ],
}

export function FitnessShell({ children }: { children: React.ReactNode }) {
  return <AppShell config={config}>{children}</AppShell>
}
