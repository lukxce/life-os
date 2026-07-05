'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppShell, ModuleConfig } from './AppShell'
import { PlaceFormSheet } from '@/components/food/PlaceFormSheet'
import { Map, List, Plus } from 'lucide-react'

const baseConfig: Omit<ModuleConfig, 'fab'> = {
  name: 'Food Map',
  emoji: '🗺️',
  home: '/food',
  accentActive: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  accentText: 'text-orange-600 dark:text-orange-400',
  accentFab: 'bg-orange-500 hover:bg-orange-600',
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
      <AppShell config={{ ...baseConfig, fab: { label: 'Add place', icon: Plus, onClick: () => setShowAdd(true) } }}>
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
