'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard, ShoppingCart, BarChart3, MoreHorizontal,
  TrendingUp, Briefcase, Building2, ArrowLeftRight, RefreshCw,
  Shield, Store, Tag, CreditCard, FileText,
  Bitcoin, ScanLine, X, Plus, Receipt, DollarSign, ChevronRight,
  PiggyBank, Target, Sparkles, Lightbulb
} from 'lucide-react'
import { cn } from '@/lib/utils'

const MORE_ITEMS = [
  { group: 'Money Flow', items: [
    { href: '/finance/income',            label: 'Income',              icon: TrendingUp },
    { href: '/finance/expenses/personal', label: 'Personal Expenses',   icon: ShoppingCart },
    { href: '/finance/expenses/business', label: 'Business Expenses',   icon: Briefcase },
    { href: '/finance/crypto',            label: 'Crypto',              icon: Bitcoin },
  ]},
  { group: 'Planning', items: [
    { href: '/finance/subscriptions', label: 'Subscriptions', icon: CreditCard },
    { href: '/finance/bills',         label: 'Bills & Loans', icon: FileText },
    { href: '/finance/budgets',       label: 'Budgets',       icon: Target },
    { href: '/finance/goals',         label: 'Goals',         icon: PiggyBank },
    { href: '/finance/planner',       label: 'Planner',       icon: Sparkles },
  ]},
  { group: 'Banking', items: [
    { href: '/finance/accounts',    label: 'Accounts',    icon: Building2 },
    { href: '/finance/transfers',   label: 'Transfers',   icon: ArrowLeftRight },
    { href: '/finance/conversions', label: 'Conversions', icon: RefreshCw },
  ]},
  { group: 'Reports', items: [
    { href: '/finance/summaries',  label: 'Summaries',  icon: BarChart3 },
    { href: '/finance/insights',   label: 'Insights',   icon: Lightbulb },
    { href: '/finance/warranties', label: 'Warranties', icon: Shield },
    { href: '/finance/merchants',  label: 'Merchants',  icon: Store },
  ]},
  { group: 'Settings', items: [
    { href: '/finance/categories', label: 'Categories', icon: Tag },
  ]},
]

const ADD_ACTIONS = [
  { href: '/finance/scan',              label: 'Scan Receipt',   icon: ScanLine,       color: 'bg-blue-600' },
  { href: '/finance/expenses/personal', label: 'Add Expense',    icon: Receipt,        color: 'bg-red-500' },
  { href: '/finance/income',            label: 'Add Income',     icon: DollarSign,     color: 'bg-green-500' },
  { href: '/finance/transfers',         label: 'Transfer',       icon: ArrowLeftRight, color: 'bg-teal-500' },
]

const EXPENSE_TYPES = [
  { href: '/finance/expenses/personal', label: 'Personal Expenses', icon: ShoppingCart, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950' },
  { href: '/finance/expenses/business', label: 'Business Expenses', icon: Briefcase,    color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950' },
]

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed bottom-16 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 rounded-t-2xl p-4 pb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        {children}
      </div>
    </>
  )
}

export function FinanceBottomNav() {
  const path = usePathname()
  const [sheet, setSheet] = useState<'add' | 'expenses' | 'more' | null>(null)
  const close = () => setSheet(null)
  const onExpensesPath = path.startsWith('/finance/expenses')

  return (
    <>
      {sheet === 'expenses' && (
        <Sheet title="Expenses" onClose={close}>
          <div className="space-y-2">
            {EXPENSE_TYPES.map(e => {
              const Icon = e.icon
              return (
                <Link key={e.href} href={e.href} onClick={close}
                  className={cn('flex items-center gap-3 p-4 rounded-xl border border-gray-100 dark:border-gray-700', e.bg)}>
                  <Icon size={20} className={e.color} />
                  <span className={cn('font-medium text-sm', e.color)}>{e.label}</span>
                  <ChevronRight size={16} className="ml-auto text-gray-400" />
                </Link>
              )
            })}
          </div>
        </Sheet>
      )}

      {sheet === 'add' && (
        <>
          <div className="fixed inset-0 z-40" onClick={close} />
          <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-3">
            {ADD_ACTIONS.map((a, i) => {
              const Icon = a.icon
              return (
                <Link key={a.href} href={a.href} onClick={close}
                  className="flex items-center gap-3"
                  style={{ animation: `fadeSlideUp 0.15s ease both`, animationDelay: `${i * 40}ms` }}>
                  <span className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-xs font-medium px-3 py-1.5 rounded-full shadow-md border border-gray-200 dark:border-gray-700 whitespace-nowrap">
                    {a.label}
                  </span>
                  <div className={`${a.color} w-12 h-12 rounded-full flex items-center justify-center shadow-lg`}>
                    <Icon size={20} className="text-white" />
                  </div>
                </Link>
              )
            })}
          </div>
          <style>{`@keyframes fadeSlideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }`}</style>
        </>
      )}

      {sheet === 'more' && (
        <Sheet title="All Pages" onClose={close}>
          <div className="max-h-[60vh] overflow-y-auto space-y-4">
            {MORE_ITEMS.map(section => (
              <div key={section.group}>
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase mb-2">{section.group}</p>
                <div className="grid grid-cols-3 gap-2">
                  {section.items.map(item => {
                    const Icon = item.icon
                    const active = path === item.href
                    return (
                      <Link key={item.href} href={item.href} onClick={close}
                        className={cn('flex flex-col items-center gap-1.5 p-3 rounded-xl text-xs font-medium transition-colors',
                          active ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400' : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300')}>
                        <Icon size={20} />
                        <span className="text-center leading-tight">{item.label}</span>
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </Sheet>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center">
          <Link href="/finance" className={cn('flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors',
            path === '/finance' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500')}>
            <LayoutDashboard size={22} />
            <span>Home</span>
          </Link>

          <button onClick={() => setSheet(s => s === 'expenses' ? null : 'expenses')}
            className={cn('flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors',
              onExpensesPath || sheet === 'expenses' ? 'text-red-500' : 'text-gray-400 dark:text-gray-500')}>
            <ShoppingCart size={22} />
            <span>Expenses</span>
          </button>

          <button onClick={() => setSheet(s => s === 'add' ? null : 'add')} className="flex-1 flex flex-col items-center py-2">
            <div className={cn('w-12 h-12 rounded-full flex items-center justify-center shadow-md transition-all duration-200',
              sheet === 'add' ? 'bg-gray-800 dark:bg-white rotate-45' : 'bg-blue-600')}>
              <Plus size={22} className="text-white dark:text-white" />
            </div>
          </button>

          <Link href="/finance/summaries" className={cn('flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors',
            path === '/finance/summaries' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500')}>
            <BarChart3 size={22} />
            <span>Reports</span>
          </Link>

          <button onClick={() => setSheet(s => s === 'more' ? null : 'more')}
            className={cn('flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors',
              sheet === 'more' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500')}>
            <MoreHorizontal size={22} />
            <span>More</span>
          </button>
        </div>
      </nav>
    </>
  )
}
