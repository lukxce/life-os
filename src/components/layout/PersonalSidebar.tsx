'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Users, ShieldCheck, Home, Menu } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_GROUPS = [
  { title: 'People', links: [
    { href: '/personal/contacts',  label: 'Contacts',  icon: Users       },
  ]},
  { title: 'Vault',  links: [
    { href: '/personal/documents', label: 'Documents', icon: ShieldCheck },
  ]},
]

interface Props { onAdd?: () => void; collapsed?: boolean; onToggle?: () => void }

export function PersonalSidebar({ onAdd, collapsed = false, onToggle }: Props) {
  const pathname = usePathname()
  return (
    <aside className={cn(
      'hidden md:flex flex-col h-screen sticky top-0 border-r border-black/5 dark:border-white/5 bg-white dark:bg-gray-900 transition-all duration-200',
      collapsed ? 'w-14' : 'w-56',
    )}>
      <div className={cn('flex items-center px-3 pt-4 pb-2', collapsed ? 'flex-col gap-2' : 'justify-between')}>
        {!collapsed && (
          <div className="flex items-center gap-2">
            <span className="text-xl">🗂️</span>
            <span className="font-bold text-sm dark:text-white">Personal</span>
          </div>
        )}
        {collapsed && <span className="text-xl">🗂️</span>}
        <button onClick={onToggle}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0">
          <Menu size={16} />
        </button>
      </div>

      {!collapsed && (
        <Link href="/" className="flex items-center gap-1.5 px-4 mb-3 text-xs text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
          <Home size={11} /> Life OS
        </Link>
      )}

      <nav className={cn('flex flex-col flex-1 overflow-y-auto', collapsed ? 'px-1.5 gap-0.5 py-2' : 'px-3 gap-5 py-1')}>
        {NAV_GROUPS.map(group => (
          <div key={group.title}>
            {!collapsed && (
              <p className="px-3 mb-1 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-600">
                {group.title}
              </p>
            )}
            {group.links.map(({ href, label, icon: Icon }) => {
              const active = pathname === href
              return (
                <Link key={href} href={href} title={collapsed ? label : undefined}
                  className={cn(
                    'flex items-center rounded-xl text-sm font-medium transition-colors',
                    collapsed ? 'justify-center py-2.5 px-2 mb-0.5' : 'gap-3 px-3 py-2',
                    active ? 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400'
                           : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800',
                  )}>
                  <Icon size={17} strokeWidth={active ? 2.5 : 2} />
                  {!collapsed && label}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>
    </aside>
  )
}
