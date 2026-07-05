'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard, TrendingUp, ShoppingCart, Briefcase,
  Building2, ArrowLeftRight, RefreshCw, BarChart3, Tag,
  ChevronDown, ChevronRight, Wallet, Banknote, LineChart, Settings, Shield,
  SlidersHorizontal, Store, Bitcoin, FileText, CreditCard, ScanLine,
  PiggyBank, Target, Sparkles, Home, Lightbulb, ShoppingBag, Menu,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type NavItem  = { href: string; label: string; icon: any }
type NavGroup = { id: string; label: string; icon: any; items: NavItem[] }
type NavEntry = NavItem | NavGroup
const isGroup = (e: NavEntry): e is NavGroup => 'items' in e

const nav: NavEntry[] = [
  { href: '/finance',      label: 'Finance Home', icon: LayoutDashboard },
  { href: '/finance/scan', label: 'Scan Receipt', icon: ScanLine },
  { id: 'money-flow', label: 'Money Flow', icon: Wallet, items: [
    { href: '/finance/income',            label: 'Income',            icon: TrendingUp   },
    { href: '/finance/expenses/personal', label: 'Personal Expenses', icon: ShoppingCart },
    { href: '/finance/expenses/business', label: 'Business Expenses', icon: Briefcase    },
  ]},
  { id: 'recurring', label: 'Recurring', icon: RefreshCw, items: [
    { href: '/finance/subscriptions', label: 'Subscriptions', icon: CreditCard },
    { href: '/finance/bills',         label: 'Bills & Loans', icon: FileText   },
  ]},
  { id: 'banking', label: 'Banking', icon: Banknote, items: [
    { href: '/finance/accounts',    label: 'Accounts',    icon: Building2      },
    { href: '/finance/transfers',   label: 'Transfers',   icon: ArrowLeftRight },
    { href: '/finance/conversions', label: 'Conversions', icon: RefreshCw      },
    { href: '/finance/crypto',      label: 'Crypto',      icon: Bitcoin        },
  ]},
  { id: 'planning', label: 'Planning', icon: Sparkles, items: [
    { href: '/finance/budgets',   label: 'Budgets',       icon: Target      },
    { href: '/finance/goals',     label: 'Goals',         icon: PiggyBank   },
    { href: '/finance/planner',   label: 'Planner',       icon: LineChart   },
    { href: '/finance/purchases', label: 'Purchase List', icon: ShoppingBag },
  ]},
  { id: 'reports', label: 'Reports', icon: BarChart3, items: [
    { href: '/finance/summaries',  label: 'Summaries',  icon: LineChart  },
    { href: '/finance/insights',   label: 'Insights',   icon: Lightbulb  },
    { href: '/finance/warranties', label: 'Warranties', icon: Shield     },
    { href: '/finance/merchants',  label: 'Merchants',  icon: Store      },
  ]},
  { id: 'settings', label: 'Settings', icon: Settings, items: [
    { href: '/finance/settings',   label: 'Preferences', icon: SlidersHorizontal },
    { href: '/finance/categories', label: 'Categories',  icon: Tag               },
  ]},
]

interface Props { collapsed?: boolean; onToggle?: () => void }

export function FinanceSidebar({ collapsed = false, onToggle }: Props) {
  const path = usePathname()
  const [manualOpen, setManualOpen] = useState<Record<string, boolean | undefined>>({})

  const isActive = (g: NavGroup) => g.items.some(i => i.href === path)
  const isOpen   = (g: NavGroup) => manualOpen[g.id] ?? isActive(g)
  const toggle   = (id: string, cur: boolean) => setManualOpen(p => ({ ...p, [id]: !cur }))

  return (
    <aside className={cn(
      'hidden md:flex flex-col h-screen sticky top-0 border-r border-black/10 dark:border-white/10 bg-white dark:bg-gray-900 transition-all duration-200',
      collapsed ? 'w-14' : 'w-64',
    )}>
      {/* Header */}
      <div className={cn(
        'flex items-center px-3 pt-4 pb-3 border-b border-black/10 dark:border-white/10',
        collapsed ? 'flex-col gap-2' : 'justify-between',
      )}>
        {!collapsed && (
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">💰 Finance</h1>
            <Link href="/" className="text-[11px] text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1 mt-0.5 transition-colors">
              <Home size={10} /> Life OS
            </Link>
          </div>
        )}
        {collapsed && <span className="text-xl">💰</span>}
        <button onClick={onToggle}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0">
          <Menu size={16} />
        </button>
      </div>

      {/* Nav */}
      <nav className={cn('flex-1 overflow-y-auto py-2', collapsed ? 'px-1.5' : 'px-3 space-y-0.5')}>
        {nav.map(entry => {
          if (!isGroup(entry)) {
            const Icon = entry.icon
            const active = path === entry.href
            return (
              <Link key={entry.href} href={entry.href} title={collapsed ? entry.label : undefined}
                className={cn(
                  'flex items-center rounded-lg text-sm font-medium transition-colors',
                  collapsed ? 'justify-center py-2.5 px-2 mb-0.5' : 'gap-3 px-3 py-2',
                  active ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                         : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
                )}>
                <Icon size={18} />
                {!collapsed && entry.label}
              </Link>
            )
          }

          const Icon   = entry.icon
          const opened = isOpen(entry)
          const active = isActive(entry)

          if (collapsed) {
            return (
              <button key={entry.id} onClick={onToggle} title={entry.label}
                className={cn(
                  'w-full flex justify-center py-2.5 px-2 mb-0.5 rounded-lg text-sm transition-colors',
                  active ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                         : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
                )}>
                <Icon size={18} />
              </button>
            )
          }

          return (
            <div key={entry.id}>
              <button onClick={() => toggle(entry.id, opened)}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  active && !opened ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                                   : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
                )}>
                <span className="flex items-center gap-3"><Icon size={18} />{entry.label}</span>
                {opened ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
              </button>
              {opened && (
                <div className="mt-0.5 ml-3 pl-3 border-l border-black/10 dark:border-white/10 space-y-0.5">
                  {entry.items.map(child => {
                    const CI = child.icon
                    const ca = path === child.href
                    return (
                      <Link key={child.href} href={child.href}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                          ca ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                             : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
                        )}>
                        <CI size={16} />{child.label}
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
  )
}
