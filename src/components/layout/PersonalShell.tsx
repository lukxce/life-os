'use client'
import { AppShell, ModuleConfig } from './AppShell'
import { LayoutDashboard, Users, ShieldCheck } from 'lucide-react'

const config: ModuleConfig = {
  name: 'Personal',
  emoji: '🗂️',
  home: '/personal',
  accentActive: 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  accentText: 'text-teal-600 dark:text-teal-400',
  accentFab: 'bg-teal-600 hover:bg-teal-700',
  groups: [
    { items: [
      { href: '/personal', label: 'Overview', icon: LayoutDashboard },
    ]},
    { title: 'People', items: [
      { href: '/personal/contacts', label: 'Contacts', icon: Users },
    ]},
    { title: 'Vault', items: [
      { href: '/personal/documents', label: 'Documents', icon: ShieldCheck },
    ]},
  ],
  tabs: [
    { href: '/personal',           label: 'Overview',  icon: LayoutDashboard },
    { href: '/personal/contacts',  label: 'Contacts',  icon: Users },
    { href: '/personal/documents', label: 'Documents', icon: ShieldCheck },
  ],
}

export function PersonalShell({ children }: { children: React.ReactNode }) {
  return <AppShell config={config}>{children}</AppShell>
}
