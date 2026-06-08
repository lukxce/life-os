'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const TABS = [
  { href: '/life/goals',    label: 'Goals'   },
  { href: '/life/contacts', label: 'People'  },
  { href: '/journal',       label: 'Journal' },
]

export function LifeNav() {
  const pathname = usePathname()
  return (
    <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl mb-5 md:hidden">
      {TABS.map(t => (
        <Link
          key={t.href}
          href={t.href}
          className={cn(
            'flex-1 text-center text-xs font-semibold py-2 rounded-lg transition-colors',
            pathname === t.href
              ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-gray-100'
              : 'text-gray-500 dark:text-gray-400'
          )}
        >
          {t.label}
        </Link>
      ))}
    </div>
  )
}
