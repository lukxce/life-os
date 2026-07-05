'use client'
import { AppShell, ModuleConfig } from './AppShell'
import { LayoutDashboard, UtensilsCrossed, Scale, Dumbbell } from 'lucide-react'

const config: ModuleConfig = {
  name: 'Fitness',
  emoji: '💪',
  home: '/fitness',
  accentActive: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  accentText: 'text-green-600 dark:text-green-400',
  accentFab: 'bg-green-600 hover:bg-green-700',
  glow: '34 197 94',
  groups: [
    { items: [
      { href: '/fitness',           label: 'Today',     icon: LayoutDashboard },
      { href: '/fitness/meal-plan', label: 'Meal Plan', icon: UtensilsCrossed },
      { href: '/fitness/body',      label: 'Body',      icon: Scale },
      { href: '/fitness/workouts',  label: 'Workouts',  icon: Dumbbell },
    ]},
  ],
  tabs: [
    { href: '/fitness',           label: 'Today',     icon: LayoutDashboard },
    { href: '/fitness/meal-plan', label: 'Meals',     icon: UtensilsCrossed },
    { href: '/fitness/workouts',  label: 'Workouts',  icon: Dumbbell },
  ],
  fab: { label: 'Log weight', icon: Scale, href: '/fitness/body' },
}

export function FitnessShell({ children }: { children: React.ReactNode }) {
  return <AppShell config={config}>{children}</AppShell>
}
