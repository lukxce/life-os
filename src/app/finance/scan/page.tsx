'use client'
import { useEffect, useState, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Check } from 'lucide-react'

function isSufUrl(s: string) { return s.includes('suf.purs.gov.rs') }
function isPfrBroj(s: string) { return /^[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]+$/i.test(s.trim()) }

type Parsed = {
  merchantName: string | null
  merchantPib: string | null
  total: number | null
  date: string | null
  sufUrl: string
  pfrRef?: string
  warning?: string | null
}

function ScanInner() {
  const router = useRouter()
  const params = useSearchParams()

  const [url,         setUrl]         = useState('')
  const [pfrInput,    setPfrInput]    = useState('')
  const [parsed,      setParsed]      = useState<Parsed | null>(null)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')
  const [expenseType, setExpenseType] = useState<'personal' | 'business'>('personal')

  const handleSufUrl = useCallback(async (sufUrl: string) => {
    setLoading(true)
    setError('')
    try {
      const res  = await fetch('/api/finance/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sufUrl }),
      })
      const data = await res.json()
      setParsed({
        merchantName: data.merchantName ?? null,
        merchantPib:  data.merchantPib  ?? null,
        total:        data.total        ?? null,
        date:         data.date         ?? null,
        sufUrl:       data.sufUrl       ?? sufUrl,
        warning:      data.pfrFailed ? 'Receipt data could not be fetched — fill in below.' : (data.warning ?? null),
      })
    } catch {
      setError('Failed to reach server.')
    }
    setLoading(false)
  }, [])

  // Handle ?url= param (from bookmarklet or share)
  useEffect(() => {
    const shared = params.get('url') || params.get('text') || ''
    if (shared && isSufUrl(shared)) handleSufUrl(shared.trim())
  }, [params, handleSufUrl])

  const confirmPfr = () => {
    setParsed({ merchantName: null, merchantPib: null, total: null, date: null, sufUrl: '',
                pfrRef: pfrInput.trim(), warning: 'Enter the amount and merchant — PFR saved as reference.' })
  }

  return (
    <div className="max-w-lg mx-auto space-y-4 pb-8">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Scan Receipt</h2>

      {!parsed && (
        <div className="space-y-3">
          {/* URL paste */}
          <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 space-y-2">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Receipt URL</p>
            <input
              value={url}
              onChange={e => {
                setUrl(e.target.value)
                if (isSufUrl(e.target.value.trim())) handleSufUrl(e.target.value.trim())
              }}
              onPaste={e => {
                const text = e.clipboardData.getData('text')
                if (isSufUrl(text.trim())) {
                  e.preventDefault()
                  setUrl(text.trim())
                  handleSufUrl(text.trim())
                }
              }}
              placeholder="https://suf.purs.gov.rs/v/?vl=..."
              autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
              className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-3 text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {url && !isSufUrl(url) && (
              <button onClick={() => handleSufUrl(url.trim())} disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors">
                {loading ? 'Parsing…' : 'Parse'}
              </button>
            )}
          </section>

          {/* PFR broj */}
          <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 space-y-2">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">PFR broj</p>
            <div className="flex gap-2">
              <input
                value={pfrInput}
                onChange={e => setPfrInput(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && isPfrBroj(pfrInput) && confirmPfr()}
                placeholder="XXXXXXXX-XXXXXXXX-XXXX"
                spellCheck={false} autoCorrect="off" autoCapitalize="characters"
                className="flex-1 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm font-mono bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 tracking-wider focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button onClick={confirmPfr} disabled={!isPfrBroj(pfrInput)}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-sm font-semibold transition-colors">
                <Check size={16} />
              </button>
            </div>
          </section>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl p-3 text-sm">
          {error}
        </div>
      )}

      {loading && !parsed && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 text-center text-sm text-gray-400 animate-pulse">
          Fetching receipt details…
        </div>
      )}

      {parsed && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Receipt details</h3>

          {parsed.warning && (
            <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 rounded-lg p-3 text-xs">
              {parsed.warning}
            </div>
          )}
          {parsed.pfrRef && (
            <p className="text-xs text-gray-400">PFR: <span className="font-mono text-gray-600 dark:text-gray-300">{parsed.pfrRef}</span></p>
          )}

          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Merchant</label>
              <input
                className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={parsed.merchantName ?? ''}
                onChange={e => setParsed(p => p && ({ ...p, merchantName: e.target.value }))}
                placeholder="e.g. Maxi, Lidl, DM…"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Amount (RSD)</label>
                <input type="number"
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={parsed.total ?? ''}
                  onChange={e => setParsed(p => p && ({ ...p, total: parseFloat(e.target.value) || null }))}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Date</label>
                <input type="date"
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={parsed.date ? new Date(parsed.date).toISOString().split('T')[0] : ''}
                  onChange={e => setParsed(p => p && ({ ...p, date: e.target.value ? new Date(e.target.value).toISOString() : null }))}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 block">Expense type</label>
            <div className="grid grid-cols-2 gap-2">
              {(['personal', 'business'] as const).map(t => (
                <button key={t} onClick={() => setExpenseType(t)}
                  className={`py-2 rounded-xl text-sm font-medium border transition-colors capitalize ${
                    expenseType === t
                      ? t === 'personal' ? 'bg-red-600 text-white border-red-600' : 'bg-purple-600 text-white border-purple-600'
                      : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}>{t}</button>
              ))}
            </div>
          </div>

          <button
            onClick={() => {
              const p = new URLSearchParams({
                merchantName: parsed.merchantName || '',
                merchantPib:  parsed.merchantPib  || '',
                sufUrl:       parsed.sufUrl        || '',
                amount:       String(parsed.total  || ''),
                date:         parsed.date ? new Date(parsed.date).toISOString().split('T')[0] : '',
              })
              router.push(`/finance/expenses/${expenseType}?${p.toString()}`)
            }}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold transition-colors">
            Continue → Add Expense
          </button>
          <button onClick={() => { setParsed(null); setUrl('') }}
            className="w-full border border-gray-200 dark:border-gray-700 py-2.5 rounded-xl text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            Start Over
          </button>
        </div>
      )}
    </div>
  )
}

export default function ScanPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400 animate-pulse">Loading…</div>}>
      <ScanInner />
    </Suspense>
  )
}
