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
  accentActive: 'bg-[rgb(220,161,84)]/10 text-[rgb(220,161,84)] dark:bg-[rgb(220,161,84)]/15 dark:text-[rgb(220,161,84)]',
  accentText: 'text-[rgb(220,161,84)] dark:text-[rgb(220,161,84)]',
  accentFab: 'bg-[rgb(220,161,84)] hover:bg-[rgb(200,141,64)]',
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
