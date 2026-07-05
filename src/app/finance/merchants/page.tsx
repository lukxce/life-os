'use client'
import { useEffect, useState, useMemo, useRef } from 'react'
import { formatRSD } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { Pencil, Check, X } from 'lucide-react'
import { toast } from 'sonner'

type Period = 'month' | 'year' | 'all'

export default function MerchantsPage() {
  const [expenses, setExpenses] = useState<any[]>([])
  const [nicknames, setNicknames] = useState<Record<string, string>>({}) // pib → customName
  const [period, setPeriod] = useState<Period>('year')
  const [sortBy, setSortBy] = useState<'total' | 'count' | 'last'>('total')
  const [editingPib, setEditingPib] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const editRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const load = async () => {
    const [exp, nicks] = await Promise.all([
      fetch(`/api/finance/expenses?period=${period}`).then(r => r.json()),
      fetch('/api/finance/merchants').then(r => r.json()),
    ])
    setExpenses(Array.isArray(exp) ? exp : [])
    const nickMap: Record<string, string> = {}
    if (Array.isArray(nicks)) nicks.forEach((n: any) => { nickMap[n.pib] = n.customName })
    setNicknames(nickMap)
  }

  useEffect(() => { load() }, [period])

  useEffect(() => {
    if (editingPib) setTimeout(() => editRef.current?.focus(), 50)
  }, [editingPib])

  const merchants = useMemo(() => {
    // --- Phase 1: group expenses by PIB (preferred) or description ---
    const byPib = new Map<string, any>()    // pib → merchant entry
    const noMatch: any[] = []               // expenses with no PIB

    for (const e of expenses) {
      const rawName = e.merchantName || e.description || 'Unknown'

      if (e.merchantPib) {
        const pib = e.merchantPib
        if (!byPib.has(pib)) {
          byPib.set(pib, { pib, name: rawName, total: 0, count: 0, last: e.date })
        }
        const m = byPib.get(pib)!
        m.total += e.amountRSD || 0
        m.count += 1
        // Keep the name from the most recently dated expense (user may have edited it)
        if (new Date(e.date) >= new Date(m.last)) {
          m.last = e.date
          m.name = rawName
        }
      } else {
        noMatch.push({ ...e, _rawName: rawName })
      }
    }

    // --- Phase 2: apply stored nicknames to PIB groups ---
    for (const [pib, m] of Array.from(byPib.entries())) {
      if (nicknames[pib]) m.name = nicknames[pib]
    }

    // --- Phase 3: try to merge PIB-less expenses into a known nickname group ---
    // If a PIB-less expense's name matches a stored nickname (case-insensitive),
    // roll it into that PIB group so spend is bundled.
    const nicknameEntries = Object.entries(nicknames) // [[pib, name], ...]
    const unmatched: any[] = []

    for (const e of noMatch) {
      const eName = e._rawName.toLowerCase()
      const match = nicknameEntries.find(([, nick]) => {
        const n = nick.toLowerCase()
        return eName.includes(n) || n.includes(eName)
      })
      if (match) {
        const [matchPib] = match
        if (byPib.has(matchPib)) {
          const m = byPib.get(matchPib)!
          m.total += e.amountRSD || 0
          m.count += 1
          if (new Date(e.date) > new Date(m.last)) m.last = e.date
        } else {
          // PIB nickname exists but no expense with that PIB yet — create the group
          byPib.set(matchPib, {
            pib: matchPib,
            name: nicknames[matchPib],
            total: e.amountRSD || 0,
            count: 1,
            last: e.date,
          })
        }
      } else {
        unmatched.push(e)
      }
    }

    // --- Phase 4: group remaining PIB-less expenses by their description ---
    const byDesc = new Map<string, any>()
    for (const e of unmatched) {
      const key = e._rawName
      if (!byDesc.has(key)) {
        byDesc.set(key, { pib: null, name: key, total: 0, count: 0, last: e.date })
      }
      const m = byDesc.get(key)!
      m.total += e.amountRSD || 0
      m.count += 1
      if (new Date(e.date) > new Date(m.last)) m.last = e.date
    }

    return [...Array.from(byPib.values()), ...Array.from(byDesc.values())]
  }, [expenses, nicknames])

  const sorted = useMemo(() => {
    return [...merchants].sort((a, b) => {
      if (sortBy === 'total') return b.total - a.total
      if (sortBy === 'count') return b.count - a.count
      return new Date(b.last).getTime() - new Date(a.last).getTime()
    })
  }, [merchants, sortBy])

  const startEdit = (m: any) => {
    if (!m.pib) return // can only rename PIB-based merchants
    setEditingPib(m.pib)
    setEditingName(m.name)
  }

  const saveEdit = async () => {
    if (!editingPib || !editingName.trim()) { cancelEdit(); return }
    await fetch('/api/finance/merchants', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pib: editingPib, customName: editingName.trim() }),
    })
    toast.success('Merchant name saved')
    setEditingPib(null)
    load()
  }

  const cancelEdit = () => { setEditingPib(null); setEditingName('') }

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
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${period === p ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 border-gray-900 dark:border-gray-100' : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
              {p === 'month' ? 'This Month' : p === 'year' ? 'This Year' : 'All Time'}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white/85 dark:bg-gray-900/70 rounded-xl border border-black/10 dark:border-white/10 overflow-hidden">
        <div className="flex items-center gap-3 p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Sort by:</span>
          {[{ key: 'total', label: 'Total Spent' }, { key: 'count', label: 'Visits' }, { key: 'last', label: 'Last Visit' }].map(s => (
            <button key={s.key} onClick={() => setSortBy(s.key as any)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${sortBy === s.key ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 border-gray-900' : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
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
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5">
              {sorted.map(m => (
                <tr
                  key={m.pib ?? m.name}
                  onClick={() => editingPib !== m.pib && goToExpenses(m)}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer group"
                >
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                    {editingPib === m.pib ? (
                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        <input
                          ref={editRef}
                          value={editingName}
                          onChange={e => setEditingName(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit() }}
                          className="border border-blue-400 rounded px-2 py-0.5 text-sm w-40 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100"
                        />
                        <button onClick={saveEdit} className="text-green-600 hover:text-green-700 p-0.5"><Check size={14} /></button>
                        <button onClick={cancelEdit} className="text-gray-400 hover:text-gray-600 p-0.5"><X size={14} /></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span>{m.name}</span>
                        {m.pib && (
                          <button
                            onClick={e => { e.stopPropagation(); startEdit(m) }}
                            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-500 transition-opacity p-0.5"
                          >
                            <Pencil size={12} />
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-400 dark:text-gray-500 text-xs">{m.pib || '—'}</td>
                  <td className="px-4 py-3 font-semibold text-red-600">{formatRSD(m.total)}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{m.count}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{formatRSD(m.total / m.count)}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{new Date(m.last).toLocaleDateString('en-GB')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
        Click the pencil icon to rename a merchant — the name is remembered for all future expenses from that PIB.
      </p>
    </div>
  )
}
