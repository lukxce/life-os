'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Map, List, Home, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

const links = [
  { href: '/food',      label: 'Map',  icon: Map  },
  { href: '/food/list', label: 'List', icon: List },
]

export function FoodSidebar({ onAdd }: { onAdd: () => void }) {
  const pathname = usePathname()
  return (
    <aside className="hidden md:flex flex-col w-56 shrink-0 h-screen sticky top-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-5">
      <div className="flex items-center gap-2.5 mb-2 px-2">
        <span className="text-xl">🗺️</span>
        <span className="font-bold tracking-tight dark:text-white">Food Map</span>
      </div>
      <Link href="/" className="flex items-center gap-1.5 px-2 mb-5 text-xs text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
        <Home size={11} /> Back to Life OS
      </Link>

      <nav className="flex flex-col gap-0.5 flex-1">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link key={href} href={href}
              className={cn('flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                active ? 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800')}>
              <Icon size={17} strokeWidth={active ? 2.5 : 2} />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
        <button onClick={onAdd}
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 w-full transition-colors">
          <Plus size={16} /> Add place
        </button>
      </div>
    </aside>
  )
}
