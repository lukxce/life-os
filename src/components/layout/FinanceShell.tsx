'use client'
import { AppShell, ModuleConfig } from './AppShell'
import {
  LayoutDashboard, TrendingUp, ShoppingCart, Briefcase, Building2, ArrowLeftRight,
  RefreshCw, BarChart3, Tag, LineChart, Shield, SlidersHorizontal, Store, Bitcoin,
  FileText, CreditCard, ScanLine, PiggyBank, Target, Lightbulb, ShoppingBag,
} from 'lucide-react'

const config: ModuleConfig = {
  name: 'Finance',
  emoji: '💰',
  home: '/finance',
  accentActive: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  accentText: 'text-blue-600 dark:text-blue-400',
  accentFab: 'bg-blue-600 hover:bg-blue-700',
  glow: '59 130 246',
  contentClassName: 'max-w-none',
  groups: [
    { items: [
      { href: '/finance',      label: 'Finance Home', icon: LayoutDashboard },
      { href: '/finance/scan', label: 'Scan Receipt', icon: ScanLine },
    ]},
    { title: 'Money Flow', items: [
      { href: '/finance/income',            label: 'Income',            icon: TrendingUp },
      { href: '/finance/expenses/personal', label: 'Personal Expenses', icon: ShoppingCart },
      { href: '/finance/expenses/business', label: 'Business Expenses', icon: Briefcase },
    ]},
    { title: 'Recurring', items: [
      { href: '/finance/subscriptions', label: 'Subscriptions', icon: CreditCard },
      { href: '/finance/bills',         label: 'Bills & Loans', icon: FileText },
    ]},
    { title: 'Banking', items: [
      { href: '/finance/accounts',    label: 'Accounts',    icon: Building2 },
      { href: '/finance/transfers',   label: 'Transfers',   icon: ArrowLeftRight },
      { href: '/finance/conversions', label: 'Conversions', icon: RefreshCw },
      { href: '/finance/crypto',      label: 'Crypto',      icon: Bitcoin },
    ]},
    { title: 'Planning', items: [
      { href: '/finance/budgets',   label: 'Budgets',       icon: Target },
      { href: '/finance/goals',     label: 'Goals',         icon: PiggyBank },
      { href: '/finance/planner',   label: 'Planner',       icon: LineChart },
      { href: '/finance/purchases', label: 'Purchase List', icon: ShoppingBag },
    ]},
    { title: 'Reports', items: [
      { href: '/finance/summaries',  label: 'Summaries',  icon: BarChart3 },
      { href: '/finance/insights',   label: 'Insights',   icon: Lightbulb },
      { href: '/finance/warranties', label: 'Warranties', icon: Shield },
      { href: '/finance/merchants',  label: 'Merchants',  icon: Store },
    ]},
    { title: 'Settings', items: [
      { href: '/finance/settings',   label: 'Preferences', icon: SlidersHorizontal },
      { href: '/finance/categories', label: 'Categories',  icon: Tag },
    ]},
  ],
  tabs: [
    { href: '/finance',                   label: 'Home',     icon: LayoutDashboard },
    { href: '/finance/expenses/personal', label: 'Expenses', icon: ShoppingCart },
    { href: '/finance/income',            label: 'Income',   icon: TrendingUp },
  ],
  actions: [
    { label: 'Scan receipt', icon: ScanLine,     href: '/finance/scan' },
    { label: 'Add expense',  icon: ShoppingCart, href: '/finance/expenses/personal' },
    { label: 'Add income',   icon: TrendingUp,   href: '/finance/income' },
    { label: 'Log transfer', icon: ArrowLeftRight, href: '/finance/transfers' },
  ],
}

export function FinanceShell({ children }: { children: React.ReactNode }) {
  return <AppShell config={config}>{children}</AppShell>
}
