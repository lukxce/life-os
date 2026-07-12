'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppShell, ModuleConfig } from './AppShell'
import { PlaceFormSheet } from '@/components/food/PlaceFormSheet'
import { Map, List, Plus, MapPin } from 'lucide-react'

const baseConfig: Omit<ModuleConfig, 'fab'> = {
  name: 'Food Map',
  icon: MapPin,
  home: '/food',
  accentActive: 'bg-[rgb(var(--l-green))]/10 text-[rgb(var(--l-green))] dark:bg-[rgb(var(--l-green))]/15 dark:text-[rgb(var(--l-green))]',
  accentText: 'text-[rgb(var(--l-green))] dark:text-[rgb(var(--l-green))]',
  accentFab: 'bg-[rgb(var(--l-green))] hover:bg-[rgb(var(--l-green))]',
  glow: '220 161 84',
  fullBleed: true,
  groups: [
    { items: [
      { href: '/food',      label: 'Map',  icon: Map },
      { href: '/food/list', label: 'List', icon: List },
    ]},
  ],
  tabs: [
    { href: '/food',      label: 'Map',  icon: Map },
    { href: '/food/list', label: 'List', icon: List },
  ],
}

export function FoodShell({ children }: { children: React.ReactNode }) {
  const [showAdd, setShowAdd] = useState(false)
  const router = useRouter()

  return (
    <>
      <AppShell config={{ ...baseConfig, actions: [{ label: 'Add place', icon: Plus, onClick: () => setShowAdd(true) }] }}>
        {children}
      </AppShell>
      {showAdd && (
        <PlaceFormSheet
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); router.refresh() }}
        />
      )}
    </>
  )
}
