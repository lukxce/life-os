'use client'
import { AppShell, ModuleConfig } from './AppShell'
import { LayoutDashboard, UtensilsCrossed, Scale, Dumbbell } from 'lucide-react'

const config: ModuleConfig = {
  name: 'Fitness',
  emoji: '💪',
  home: '/fitness',
  accentActive: 'bg-[rgb(220,161,84)]/10 text-[rgb(220,161,84)] dark:bg-[rgb(220,161,84)]/15 dark:text-[rgb(220,161,84)]',
  accentText: 'text-[rgb(220,161,84)] dark:text-[rgb(220,161,84)]',
  accentFab: 'bg-[rgb(220,161,84)] hover:bg-[rgb(200,141,64)]',
  glow: '220 161 84',
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
  actions: [
    { label: 'Log weight',  icon: Scale,    href: '/fitness/body' },
    { label: 'Log workout', icon: Dumbbell, href: '/fitness/workouts' },
  ],
}

export function FitnessShell({ children }: { children: React.ReactNode }) {
  return <AppShell config={config}>{children}</AppShell>
}
