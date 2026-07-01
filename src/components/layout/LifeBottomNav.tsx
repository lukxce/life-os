'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, CalendarCheck, Target, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

const LINKS_LEFT = [
  { href: '/life',        label: 'Today',  icon: CalendarDays  },
  { href: '/life/weekly', label: 'Weekly', icon: CalendarCheck },
]
const LINKS_RIGHT = [
  { href: '/life/goals', label: 'Goals', icon: Target },
]

export function LifeBottomNav({ onAdd }: { onAdd: () => void }) {
  const pathname = usePathname()

  function NavLink({ href, label, icon: Icon }: { href: string; label: string; icon: typeof CalendarDays }) {
    const active = pathname === href
    return (
      <Link href={href}
        className={cn('flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-colors min-w-[52px]',
          active ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500')}>
        <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
        <span className="text-[10px] font-medium">{label}</span>
      </Link>
    )
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 pb-4 pt-2 bg-white/95 dark:bg-gray-900/95 backdrop-blur border-t border-gray-100 dark:border-gray-800">
      <div className="flex items-center justify-around max-w-sm mx-auto px-2">
        {LINKS_LEFT.map(l => <NavLink key={l.href} {...l} />)}

        <button onClick={onAdd}
          className="flex items-center justify-center w-14 h-14 rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 active:scale-95 transition-all -mt-5">
          <Plus size={26} strokeWidth={2.5} />
        </button>

        {LINKS_RIGHT.map(l => <NavLink key={l.href} {...l} />)}
      </div>
    </nav>
  )
}
