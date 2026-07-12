'use client'
import { AppShell, ModuleConfig } from './AppShell'
import { LayoutDashboard, Users, ShieldCheck, FolderLock } from 'lucide-react'

const config: ModuleConfig = {
  name: 'Personal',
  icon: FolderLock,
  home: '/personal',
  accentActive: 'bg-[rgb(var(--l-green))]/10 text-[rgb(var(--l-green))] dark:bg-[rgb(var(--l-green))]/15 dark:text-[rgb(var(--l-green))]',
  accentText: 'text-[rgb(var(--l-green))] dark:text-[rgb(var(--l-green))]',
  accentFab: 'bg-[rgb(var(--l-green))] hover:bg-[rgb(147,100,140)]',
  glow: '167 120 160',
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
