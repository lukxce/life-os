'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Map, List, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

export function FoodBottomNav({ onAdd }: { onAdd: () => void }) {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 pb-4 pt-2 bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border-t border-black/5 dark:border-white/5">
      <div className="flex items-center justify-around max-w-sm mx-auto px-2">
        <Link href="/food"
          className={cn('flex flex-col items-center gap-0.5 px-5 py-1 rounded-xl transition-colors',
            pathname === '/food' ? 'text-orange-500' : 'text-gray-400 dark:text-gray-500')}>
          <Map size={22} strokeWidth={pathname === '/food' ? 2.5 : 1.8} />
          <span className="text-[10px] font-medium">Map</span>
        </Link>

        <button onClick={onAdd}
          className="flex items-center justify-center w-14 h-14 rounded-full bg-orange-500 text-white shadow-lg shadow-orange-500/30 hover:bg-orange-600 active:scale-95 transition-all -mt-5">
          <Plus size={26} strokeWidth={2.5} />
        </button>

        <Link href="/food/list"
          className={cn('flex flex-col items-center gap-0.5 px-5 py-1 rounded-xl transition-colors',
            pathname === '/food/list' ? 'text-orange-500' : 'text-gray-400 dark:text-gray-500')}>
          <List size={22} strokeWidth={pathname === '/food/list' ? 2.5 : 1.8} />
          <span className="text-[10px] font-medium">List</span>
        </Link>
      </div>
    </nav>
  )
}
