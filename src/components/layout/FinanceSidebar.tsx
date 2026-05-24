'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard, TrendingUp, ShoppingCart, Briefcase,
  Building2, ArrowLeftRight, RefreshCw, BarChart3, Tag, X, ScanLine,
  ChevronDown, ChevronRight, Wallet, Banknote, LineChart, Settings, Shield, SlidersHorizontal, Store,
  Bitcoin, FileText, CreditCard, Search, PiggyBank, Target, Sparkles, Home
} from 'lucide-react'
import { cn } from '@/lib/utils'

type NavItem = { href: string; label: string; icon: any }
type NavGroup = { id: string; label: string; icon: any; items: NavItem[] }
type NavEntry = NavItem | NavGroup

const isGroup = (e: NavEntry): e is NavGroup => 'items' in e

const nav: NavEntry[] = [
  { href: '/finance', label: 'Finance Home', icon: LayoutDashboard },
  { href: '/finance/scan', label: 'Scan Receipt', icon: ScanLine },
  {
    id: 'money-flow',
    label: 'Money Flow',
    icon: Wallet,
    items: [
      { href: '/finance/income',            label: 'Income',            icon: TrendingUp },
      { href: '/finance/expenses/personal', label: 'Personal Expenses', icon: ShoppingCart },
      { href: '/finance/expenses/business', label: 'Business Expenses', icon: Briefcase },
      { href: '/finance/crypto',            label: 'Crypto',            icon: Bitcoin },
    ],
  },
  {
    id: 'planning',
    label: 'Planning',
    icon: Sparkles,
    items: [
      { href: '/finance/subscriptions', label: 'Subscriptions', icon: CreditCard },
      { href: '/finance/bills',         label: 'Bills & Loans', icon: FileText },
      { href: '/finance/budgets',       label: 'Budgets',       icon: Target },
      { href: '/finance/goals',         label: 'Goals',         icon: PiggyBank },
      { href: '/finance/planner',       label: 'Planner',       icon: LineChart },
    ],
  },
  {
    id: 'banking',
    label: 'Banking',
    icon: Banknote,
    items: [
      { href: '/finance/accounts',    label: 'Accounts',    icon: Building2 },
      { href: '/finance/transfers',   label: 'Transfers',   icon: ArrowLeftRight },
      { href: '/finance/conversions', label: 'Conversions', icon: RefreshCw },
    ],
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: BarChart3,
    items: [
      { href: '/finance/summaries',  label: 'Summaries',  icon: LineChart },
      { href: '/finance/warranties', label: 'Warranties', icon: Shield },
      { href: '/finance/merchants',  label: 'Merchants',  icon: Store },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    items: [
      { href: '/finance/settings',   label: 'Preferences', icon: SlidersHorizontal },
      { href: '/finance/categories', label: 'Categories',  icon: Tag },
    ],
  },
]

export function FinanceSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const path = usePathname()
  const [manualOpen, setManualOpen] = useState<Record<string, boolean | undefined>>({})

  useEffect(() => {
    onClose()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path])

  const isGroupActive = (g: NavGroup) => g.items.some(i => i.href === path)
  const isGroupOpen = (g: NavGroup) => {
    const manual = manualOpen[g.id]
    if (manual !== undefined) return manual
    return isGroupActive(g)
  }
  const toggleGroup = (id: string, currentlyOpen: boolean) => {
    setManualOpen(prev => ({ ...prev, [id]: !currentlyOpen }))
  }

  return (
    <>
      {open && (
        <div onClick={onClose} className="fixed inset-0 bg-black/40 z-30 md:hidden" />
      )}
      <aside className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col h-screen sticky top-0">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">💰 Finance</h1>
            <Link href="/" className="text-xs text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 mt-1 flex items-center gap-1 transition-colors">
              <Home size={11} /> Back to Life OS
            </Link>
          </div>
          <button onClick={onClose} className="md:hidden p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
            <X size={20} />
          </button>
        </div>

        <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => {
              const e = new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true })
              window.dispatchEvent(e)
            }}
            className="w-full flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors"
          >
            <Search size={14} />
            <span>Search...</span>
            <kbd className="ml-auto text-xs bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded px-1.5 py-0.5">⌘K</kbd>
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto bg-white dark:bg-gray-900">
          {nav.map(entry => {
            if (!isGroup(entry)) {
              const Icon = entry.icon
              const active = path === entry.href
              return (
                <Link key={entry.href} href={entry.href}
                  className={cn('flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    active ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800')}>
                  <Icon size={18} />
                  {entry.label}
                </Link>
              )
            }

            const Icon = entry.icon
            const opened = isGroupOpen(entry)
            const active = isGroupActive(entry)

            return (
              <div key={entry.id}>
                <button onClick={() => toggleGroup(entry.id, opened)}
                  className={cn('w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    active && !opened ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800')}>
                  <span className="flex items-center gap-3"><Icon size={18} />{entry.label}</span>
                  {opened ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
                </button>
                {opened && (
                  <div className="mt-1 ml-3 pl-3 border-l border-gray-200 dark:border-gray-700 space-y-1">
                    {entry.items.map(child => {
                      const ChildIcon = child.icon
                      const childActive = path === child.href
                      return (
                        <Link key={child.href} href={child.href}
                          className={cn('flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                            childActive ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800')}>
                          <ChildIcon size={16} />
                          {child.label}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>
      </aside>
    </>
  )
}
