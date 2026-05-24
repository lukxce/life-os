'use client'
import { useState, useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Plus, X, TrendingUp, ShoppingCart, ArrowLeftRight, ScanLine } from 'lucide-react'

const actions = [
  { label: 'Scan Receipt', icon: ScanLine,      href: '/scan',             color: 'bg-blue-500' },
  { label: 'Add Expense',  icon: ShoppingCart,  href: '/expenses/personal', color: 'bg-red-500' },
  { label: 'Add Income',   icon: TrendingUp,    href: '/income',            color: 'bg-green-500' },
  { label: 'Transfer',     icon: ArrowLeftRight, href: '/transfers',        color: 'bg-teal-500' },
]

export function QuickAddFab() {
  const [open, setOpen] = useState(false)
  const path = usePathname()
  const router = useRouter()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => { setOpen(false) }, [path])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = actions.filter(a => a.href !== path)

  return (
    <div ref={ref} className="fixed bottom-6 right-6 z-50 md:hidden flex flex-col-reverse items-end gap-3">
      {open && filtered.map(a => {
        const Icon = a.icon
        return (
          <button key={a.href} onClick={() => router.push(a.href)}
            className={`flex items-center gap-2 ${a.color} text-white pl-3 pr-4 py-2.5 rounded-full shadow-lg text-sm font-medium`}>
            <Icon size={16} />
            {a.label}
          </button>
        )
      })}
      <button onClick={() => setOpen(o => !o)}
        className="w-14 h-14 bg-blue-600 text-white rounded-full shadow-xl flex items-center justify-center hover:bg-blue-700 transition-colors">
        {open ? <X size={22} /> : <Plus size={24} />}
      </button>
    </div>
  )
}
