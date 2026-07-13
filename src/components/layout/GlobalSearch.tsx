'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, Receipt, TrendingUp, CreditCard, FileText, Dumbbell, Target, Users, MapPin, Loader2, Clapperboard } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/utils'

interface AllResults {
  finance: {
    expenses: any[]
    income: any[]
    subscriptions: any[]
    bills: any[]
  }
  life: {
    habits: any[]
    goals: any[]
    contacts: any[]
    watchlist: any[]
  }
  food: {
    places: any[]
  }
}

const CATEGORY_DOT: Record<string, string> = {
  been: '#22c55e',
  want_to_go: '#3b82f6',
  regular: '#f59e0b',
}

export function GlobalSearch({ mobileIconOnly, keyboardOnly }: { mobileIconOnly?: boolean; keyboardOnly?: boolean } = {}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [results, setResults] = useState<AllResults | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

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
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  useEffect(() => {
    if (!q || q.length < 2) { setResults(null); return }
    const t = setTimeout(async () => {
      setLoading(true)
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(q)}`).then(res => res.json())
        setResults(r)
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => clearTimeout(t)
  }, [q])

  const go = useCallback((href: string) => {
    setOpen(false)
    setQ('')
    setResults(null)
    router.push(href)
  }, [router])

  const totalResults = results
    ? (results.finance.expenses.length + results.finance.income.length + results.finance.subscriptions.length + results.finance.bills.length
      + results.life.habits.length + results.life.goals.length + results.life.contacts.length + (results.life.watchlist?.length ?? 0)
      + results.food.places.length)
    : 0

  if (!open && keyboardOnly) return null

  if (!open && mobileIconOnly) return (
    <button onClick={() => setOpen(true)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" title="Search (⌘K)">
      <Search size={20} className="text-gray-600 dark:text-gray-300" />
    </button>
  )

  if (!open) return (
    <button
      onClick={() => setOpen(true)}
      className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 px-3 py-1.5 rounded-lg border border-black/10 dark:border-white/10 transition-colors"
    >
      <Search size={14} />
      <span>Search everything...</span>
      <kbd className="ml-2 text-xs bg-surface/90 dark:bg-surface/70 border border-black/10 dark:border-white/10 rounded px-1.5 py-0.5">⌘K</kbd>
    </button>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4">
      <div className="fixed inset-0 bg-black/50" onClick={() => setOpen(false)} />
      <div className="relative w-full max-w-lg bg-surface/90 dark:bg-surface/70 rounded-2xl shadow-2xl border border-black/10 dark:border-white/10 overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-black/10 dark:border-white/10">
          <Search size={16} className="text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search habits, goals, expenses, places…"
            className="flex-1 bg-transparent text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 outline-none"
          />
          {loading && <Loader2 size={14} className="animate-spin text-ldg-green shrink-0" />}
          <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-0.5">
            <X size={16} />
          </button>
        </div>

        {/* Module pills */}
        <div className="flex gap-2 px-4 py-2 border-b border-black/5 dark:border-white/5 bg-gray-50 dark:bg-gray-800/50">
          {[
            { label: '💰 Finance', color: 'text-ldg-green' },
            { label: '🌿 Life',    color: 'text-ldg-green' },
            { label: '🍽 Food',   color: 'text-ldg-green' },
          ].map(m => (
            <span key={m.label} className={cn('text-xs font-medium', m.color)}>{m.label}</span>
          ))}
          <span className="ml-auto text-xs text-gray-400">⌘K to toggle</span>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {q.length < 2 && (
            <div className="py-10 text-center text-sm text-gray-400">
              Type at least 2 characters to search across all modules
            </div>
          )}

          {q.length >= 2 && !loading && totalResults === 0 && (
            <div className="py-10 text-center text-sm text-gray-400">
              No results for &ldquo;{q}&rdquo;
            </div>
          )}

          {results && (
            <div className="p-2 space-y-1">
              {/* ── Finance ──────────────────────────────────────── */}
              {results.finance.expenses.length > 0 && (
                <Section label="Expenses">
                  {results.finance.expenses.map((e: any) => (
                    <ResultItem key={e.id} icon={<Receipt size={13} className="text-red-500" />}
                      title={e.description || e.merchantName || e.category}
                      sub={`${formatDate(e.date)} · ${e.category}`}
                      right={`${e.amount.toLocaleString()} ${e.currency}`}
                      rightColor="text-red-600 dark:text-red-400"
                      onClick={() => go(`/finance/expenses/${e.type}`)} />
                  ))}
                </Section>
              )}

              {results.finance.income.length > 0 && (
                <Section label="Income">
                  {results.finance.income.map((inc: any) => (
                    <ResultItem key={inc.id} icon={<TrendingUp size={13} className="text-green-500" />}
                      title={inc.client || inc.type}
                      sub={`${formatDate(inc.date)} · ${inc.type}`}
                      right={`${inc.netAmount.toLocaleString()} ${inc.currency}`}
                      rightColor="text-green-600 dark:text-green-400"
                      onClick={() => go('/finance/income')} />
                  ))}
                </Section>
              )}

              {results.finance.subscriptions.length > 0 && (
                <Section label="Subscriptions">
                  {results.finance.subscriptions.map((s: any) => (
                    <ResultItem key={s.id} icon={<CreditCard size={13} className="text-ldg-green" />}
                      title={s.name}
                      sub={s.category ?? 'Subscription'}
                      right={`${s.billingAmount} ${s.billingCurrency}/mo`}
                      rightColor="text-ldg-green"
                      onClick={() => go('/finance/subscriptions')} />
                  ))}
                </Section>
              )}

              {results.finance.bills.length > 0 && (
                <Section label="Bills">
                  {results.finance.bills.map((b: any) => (
                    <ResultItem key={b.id} icon={<FileText size={13} className="text-ldg-ink/55" />}
                      title={b.name}
                      sub={`Due day ${b.dayOfMonth}${b.category ? ` · ${b.category}` : ''}`}
                      right={`${b.amount.toLocaleString()} ${b.currency}`}
                      rightColor="text-ldg-ink/55"
                      onClick={() => go('/finance/bills')} />
                  ))}
                </Section>
              )}

              {/* ── Life ─────────────────────────────────────────── */}
              {results.life.habits.length > 0 && (
                <Section label="Habits">
                  {results.life.habits.map((h: any) => (
                    <ResultItem key={h.id} icon={<Dumbbell size={13} className="text-ldg-green" />}
                      title={h.name}
                      sub={`${h.category} · ${h.frequency}`}
                      badge={!h.active ? 'Inactive' : h.paused ? 'Paused' : undefined}
                      onClick={() => go('/life/habits')} />
                  ))}
                </Section>
              )}

              {results.life.goals.length > 0 && (
                <Section label="Goals">
                  {results.life.goals.map((g: any) => (
                    <ResultItem key={g.id} icon={<Target size={13} className="text-ldg-ink/55" />}
                      title={`${g.emoji ?? ''} ${g.name}`.trim()}
                      sub={g.type.replace('_', ' ')}
                      badge={g.completed ? 'Done' : undefined}
                      badgeColor={g.completed ? 'bg-ldg-green/10 text-ldg-green' : undefined}
                      onClick={() => go('/life/goals')} />
                  ))}
                </Section>
              )}

              {results.life.contacts.length > 0 && (
                <Section label="People">
                  {results.life.contacts.map((c: any) => (
                    <ResultItem key={c.id} icon={<Users size={13} className="text-ldg-ink/55" />}
                      title={`${c.emoji ?? ''} ${c.name}`.trim()}
                      sub={`Reach out ${c.reachOutFrequency}`}
                      onClick={() => go('/people')} />
                  ))}
                </Section>
              )}

              {/* ── Watchlist ────────────────────────────────────── */}
              {(results.life.watchlist ?? []).length > 0 && (
                <Section label="Watchlist">
                  {results.life.watchlist.map((w: any) => (
                    <ResultItem key={w.id} icon={<Clapperboard size={13} className="text-ldg-ink/55" />}
                      title={w.title}
                      sub={[
                        w.type === 'book' ? w.author : (w.type === 'tv' ? 'TV' : 'Movie'),
                        w.year,
                        w.status.replace('_', ' '),
                      ].filter(Boolean).join(' · ')}
                      right={w.myRating != null ? `★ ${w.myRating}/10` : undefined}
                      rightColor="text-ldg-ink/55"
                      onClick={() => go('/watchlist')} />
                  ))}
                </Section>
              )}

              {/* ── Food ─────────────────────────────────────────── */}
              {results.food.places.length > 0 && (
                <Section label="Places">
                  {results.food.places.map((p: any) => (
                    <ResultItem key={p.id}
                      icon={
                        <span className="w-3.5 h-3.5 rounded-full shrink-0 mt-0.5"
                          style={{ background: CATEGORY_DOT[p.category] ?? '#6b7280', display: 'inline-block' }} />
                      }
                      title={p.name}
                      sub={[p.city, p.cuisine].filter(Boolean).join(' · ')}
                      right={p.myRating != null ? `${p.myRating}/10` : undefined}
                      rightColor="text-ldg-green"
                      onClick={() => go('/food/list')} />
                  ))}
                </Section>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 px-2 py-1.5">{label}</p>
      {children}
    </div>
  )
}

function ResultItem({
  icon, title, sub, right, rightColor, badge, badgeColor, onClick,
}: {
  icon: React.ReactNode
  title: string
  sub?: string
  right?: string
  rightColor?: string
  badge?: string
  badgeColor?: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
    >
      <span className="shrink-0 mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{title}</p>
        {sub && <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{sub}</p>}
      </div>
      {badge && (
        <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0', badgeColor ?? 'bg-ldg-ink/[0.06] text-ldg-ink/55')}>
          {badge}
        </span>
      )}
      {right && <span className={cn('text-xs font-semibold shrink-0', rightColor ?? 'text-gray-500')}>{right}</span>}
    </button>
  )
}
