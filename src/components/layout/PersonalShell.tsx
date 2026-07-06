'use client'
import { AppShell, ModuleConfig } from './AppShell'
import { LayoutDashboard, Users, ShieldCheck, FolderLock } from 'lucide-react'

const config: ModuleConfig = {
  name: 'Personal',
  icon: FolderLock,
  home: '/personal',
  accentActive: 'bg-[rgb(167,120,160)]/10 text-[rgb(167,120,160)] dark:bg-[rgb(167,120,160)]/15 dark:text-[rgb(167,120,160)]',
  accentText: 'text-[rgb(167,120,160)] dark:text-[rgb(167,120,160)]',
  accentFab: 'bg-[rgb(167,120,160)] hover:bg-[rgb(147,100,140)]',
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
