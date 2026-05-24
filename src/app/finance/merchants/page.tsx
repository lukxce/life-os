'use client'
import { useEffect, useState, useMemo } from 'react'
import { formatRSD } from '@/lib/utils'
import { useRouter } from 'next/navigation'

type Period = 'month' | 'year' | 'all'

export default function MerchantsPage() {
  const [expenses, setExpenses] = useState<any[]>([])
  const [period, setPeriod] = useState<Period>('year')
  const [sortBy, setSortBy] = useState<'total' | 'count' | 'last'>('total')
  const router = useRouter()

  useEffect(() => {
    fetch(`/api/finance/expenses?period=${period}`).then(r => r.json()).then(d => setExpenses(Array.isArray(d) ? d : []))
  }, [period])

  const merchants = useMemo(() => {
    const map = new Map<string, any>()
    for (const e of expenses) {
      const key = e.merchantPib || e.merchantName || e.description || 'Unknown'
      if (!map.has(key)) {
        map.set(key, { key, name: e.merchantName || e.description || 'Unknown', pib: e.merchantPib || null, total: 0, count: 0, last: e.date })
      }
      const m = map.get(key)!
      m.total += e.amountRSD || 0
      m.count += 1
      if (new Date(e.date) > new Date(m.last)) m.last = e.date
    }
    return Array.from(map.values())
  }, [expenses])

  const sorted = useMemo(() => {
    return [...merchants].sort((a, b) => {
      if (sortBy === 'total') return b.total - a.total
      if (sortBy === 'count') return b.count - a.count
      return new Date(b.last).getTime() - new Date(a.last).getTime()
    })
  }, [merchants, sortBy])

  const goToExpenses = (m: any) => {
    const q = m.pib ? `merchantPib=${m.pib}` : ''
    router.push(`/finance/expenses/personal${q ? `?${q}` : ''}`)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Top Merchants</h2>
        <div className="flex gap-2">
          {(['month', 'year', 'all'] as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${period === p ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-800'}`}>
              {p === 'month' ? 'This Month' : p === 'year' ? 'This Year' : 'All Time'}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 dark:border-gray-700 overflow-hidden">
        <div className="flex items-center gap-3 p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <span className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">Sort by:</span>
          {[{ key: 'total', label: 'Total Spent' }, { key: 'count', label: 'Visits' }, { key: 'last', label: 'Last Visit' }].map(s => (
            <button key={s.key} onClick={() => setSortBy(s.key as any)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${sortBy === s.key ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-800'}`}>
              {s.label}
            </button>
          ))}
        </div>

        {sorted.length === 0 ? (
          <p className="text-center text-gray-400 dark:text-gray-500 py-12">No expenses with merchant data this period</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 dark:border-gray-700">
              <tr>
                {['Merchant', 'PIB', 'Total (RSD)', 'Visits', 'Avg / Visit', 'Last Visit'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sorted.map(m => (
                <tr key={m.key} onClick={() => goToExpenses(m)} className="hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-800 cursor-pointer">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{m.name}</td>
                  <td className="px-4 py-3 text-gray-400 dark:text-gray-500 text-xs">{m.pib || '—'}</td>
                  <td className="px-4 py-3 font-semibold text-red-600">{formatRSD(m.total)}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{m.count}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 dark:text-gray-500">{formatRSD(m.total / m.count)}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 dark:text-gray-500">{new Date(m.last).toLocaleDateString('en-GB')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
