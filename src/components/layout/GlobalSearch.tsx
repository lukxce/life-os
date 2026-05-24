'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Command } from 'cmdk'
import { Search, X, Receipt, TrendingUp, Building2, CreditCard, FileText } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface SearchResults {
  expenses: any[]
  income: any[]
  accounts: any[]
  subscriptions: any[]
  bills: any[]
}

export function GlobalSearch({ mobileIconOnly, keyboardOnly }: { mobileIconOnly?: boolean; keyboardOnly?: boolean } = {}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [results, setResults] = useState<SearchResults | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(o => !o)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (!q || q.length < 2) { setResults(null); return }
    const t = setTimeout(async () => {
      setLoading(true)
      try {
        const r = await fetch(`/api/finance/search?q=${encodeURIComponent(q)}`).then(res => res.json())
        setResults(r)
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => clearTimeout(t)
  }, [q])

  const go = (href: string) => {
    setOpen(false)
    setQ('')
    setResults(null)
    router.push(href)
  }

  const total = results ? results.expenses.length + results.income.length + results.accounts.length + results.subscriptions.length + results.bills.length : 0

  if (!open && keyboardOnly) return null

  if (!open && mobileIconOnly) return (
    <button onClick={() => setOpen(true)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
      <Search size={20} className="text-gray-600 dark:text-gray-300" />
    </button>
  )

  if (!open) return (
    <button
      onClick={() => setOpen(true)}
      className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors"
    >
      <Search size={14} />
      <span>Search...</span>
      <kbd className="ml-2 text-xs bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded px-1.5 py-0.5">⌘K</kbd>
    </button>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4">
      <div className="fixed inset-0 bg-black/50" onClick={() => setOpen(false)} />
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <Command shouldFilter={false}>
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <Search size={16} className="text-gray-400 shrink-0" />
            <Command.Input
              autoFocus
              value={q}
              onValueChange={setQ}
              placeholder="Search expenses, income, accounts..."
              className="flex-1 bg-transparent text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 outline-none"
            />
            {loading && <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin shrink-0" />}
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
              <X size={16} />
            </button>
          </div>

          <Command.List className="max-h-[60vh] overflow-y-auto p-2">
            {q.length < 2 && (
              <Command.Empty className="py-8 text-center text-sm text-gray-400">
                Type at least 2 characters to search
              </Command.Empty>
            )}

            {q.length >= 2 && !loading && total === 0 && (
              <Command.Empty className="py-8 text-center text-sm text-gray-400">
                No results for "{q}"
              </Command.Empty>
            )}

            {results && results.expenses.length > 0 && (
              <Command.Group heading={<span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase px-2">Expenses</span>}>
                {results.expenses.map((e: any) => (
                  <Command.Item key={e.id} onSelect={() => go(`/expenses/${e.type}`)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 aria-selected:bg-gray-100 dark:aria-selected:bg-gray-800">
                    <Receipt size={14} className="text-red-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{e.description || e.merchantName || e.category}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{formatDate(e.date)} · {e.category}</div>
                    </div>
                    <span className="text-sm font-semibold text-red-600 shrink-0">{e.amount.toLocaleString()} {e.currency}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {results && results.income.length > 0 && (
              <Command.Group heading={<span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase px-2">Income</span>}>
                {results.income.map((inc: any) => (
                  <Command.Item key={inc.id} onSelect={() => go('/income')}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 aria-selected:bg-gray-100 dark:aria-selected:bg-gray-800">
                    <TrendingUp size={14} className="text-green-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{inc.client || inc.type}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{formatDate(inc.date)} · {inc.type}</div>
                    </div>
                    <span className="text-sm font-semibold text-green-600 shrink-0">{inc.netAmount.toLocaleString()} {inc.currency}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {results && results.accounts.length > 0 && (
              <Command.Group heading={<span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase px-2">Accounts</span>}>
                {results.accounts.map((a: any) => (
                  <Command.Item key={a.id} onSelect={() => go('/accounts')}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 aria-selected:bg-gray-100 dark:aria-selected:bg-gray-800">
                    <Building2 size={14} className="text-teal-500 shrink-0" />
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{a.name}</div>
                    <span className="ml-auto text-xs text-gray-500 dark:text-gray-400 shrink-0">{a.currency} · {a.type}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {results && results.subscriptions.length > 0 && (
              <Command.Group heading={<span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase px-2">Subscriptions</span>}>
                {results.subscriptions.map((s: any) => (
                  <Command.Item key={s.id} onSelect={() => go('/subscriptions')}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 aria-selected:bg-gray-100 dark:aria-selected:bg-gray-800">
                    <CreditCard size={14} className="text-blue-500 shrink-0" />
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{s.name}</div>
                    <span className="ml-auto text-sm font-semibold text-blue-600 shrink-0">{s.billingAmount} {s.billingCurrency}/mo</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {results && results.bills.length > 0 && (
              <Command.Group heading={<span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase px-2">Bills</span>}>
                {results.bills.map((b: any) => (
                  <Command.Item key={b.id} onSelect={() => go('/bills')}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 aria-selected:bg-gray-100 dark:aria-selected:bg-gray-800">
                    <FileText size={14} className="text-teal-500 shrink-0" />
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{b.name}</div>
                    <span className="ml-auto text-sm font-semibold text-teal-600 shrink-0">{b.amount.toLocaleString()} {b.currency}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}
          </Command.List>
        </Command>
      </div>
    </div>
  )
}
