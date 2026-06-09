'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Users, ShieldCheck, Home, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_GROUPS = [
  {
    title: 'People',
    links: [
      { href: '/personal/contacts', label: 'Contacts', icon: Users },
    ],
  },
  {
    title: 'Vault',
    links: [
      { href: '/personal/documents', label: 'Documents', icon: ShieldCheck },
    ],
  },
]

export function PersonalSidebar({ onAdd }: { onAdd?: () => void }) {
  const pathname = usePathname()
  return (
    <aside className="hidden md:flex flex-col w-56 shrink-0 h-screen sticky top-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-5">
      <div className="flex items-center gap-2.5 mb-2 px-2">
        <span className="text-xl">🗂️</span>
        <span className="font-bold tracking-tight dark:text-white">Personal</span>
      </div>
      <Link href="/" className="flex items-center gap-1.5 px-2 mb-4 text-xs text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
        <Home size={11} /> Dashboard
      </Link>

      <nav className="flex flex-col gap-5 flex-1 overflow-y-auto">
        {NAV_GROUPS.map(group => (
          <div key={group.title}>
            <p className="px-3 mb-1 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-600">
              {group.title}
            </p>
            {group.links.map(({ href, label, icon: Icon }) => {
              const active = pathname === href
              return (
                <Link key={href} href={href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors',
                    active
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  )}>
                  <Icon size={17} strokeWidth={active ? 2.5 : 2} />
                  {label}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
        <button onClick={onAdd}
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 w-full transition-colors">
          <Plus size={16} /> Add
        </button>
      </div>
    </aside>
  )
}
