'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, Settings2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const LINKS = [
  { href: '/journal',            label: 'Journal',  icon: BookOpen  },
  { href: '/journal?settings=1', label: 'Questions', icon: Settings2 },
]

export function JournalBottomNav() {
  const pathname = usePathname()
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 pb-4 pt-2 bg-white/95 dark:bg-gray-900/95 backdrop-blur border-t border-gray-100 dark:border-gray-800">
      <div className="flex items-center justify-around max-w-sm mx-auto px-2">
        {LINKS.map(({ href, label, icon: Icon }) => {
          const active = href === '/journal' ? pathname === '/journal' : false
          return (
            <Link key={href} href={href}
              className={cn(
                'flex flex-col items-center gap-0.5 px-5 py-1 rounded-xl transition-colors min-w-[72px]',
                active ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400 dark:text-gray-500',
              )}>
              <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
