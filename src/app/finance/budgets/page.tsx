'use client'
import { useEffect, useState } from 'react'
import { Plus, Trash2, Pencil, X } from 'lucide-react'
import { toast } from 'sonner'
import { NumberInput } from '@/components/ui/NumberInput'
import { ScoreRing } from '@/components/ui/synth'
import { cn } from '@/lib/utils'

const defaultForm = { category: '', amountRSD: '', amountEUR: '', period: 'month' }

function statusWord(pct: number) {
  if (pct >= 100) return { label: 'Over',       tone: 'text-[rgb(var(--coral))]' }
  if (pct >= 80)  return { label: 'Getting close', tone: 'text-[rgb(var(--amber))]' }
  return                 { label: 'On track',   tone: 'text-emerald-500' }
}

function inputCls() {
  return 'mt-1 w-full border border-black/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-[rgb(var(--l-green))]'
}

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [spent, setSpent] = useState<Record<string, { rsd: number; eur: number }>>({})
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(defaultForm)

  const load = async () => {
    const now = new Date()
    const [b, c, expenses] = await Promise.all([
      fetch('/api/finance/budgets').then(r => r.json()),
      fetch('/api/finance/categories').then(r => r.json()),
      fetch(`/api/finance/expenses?period=month&date=${now.toISOString().split('T')[0]}`).then(r => r.json()),
    ])
    setBudgets(Array.isArray(b) ? b : [])
    setCategories(Array.isArray(c) ? c : [])

    const spentMap: Record<string, { rsd: number; eur: number }> = {}
    if (Array.isArray(expenses)) {
      for (const e of expenses) {
        if (!spentMap[e.category]) spentMap[e.category] = { rsd: 0, eur: 0 }
        if (e.currency === 'EUR') spentMap[e.category].eur += e.amount
        else spentMap[e.category].rsd += e.amount
      }
    }
    setSpent(spentMap)
  }

  useEffect(() => { load() }, [])

  const submit = async () => {
    if (!form.category) { toast.error('Pick a category first'); return }
    const payload = { ...form, amountRSD: form.amountRSD ? +form.amountRSD : null, amountEUR: form.amountEUR ? +form.amountEUR : null }
    if (editingId) {
      await fetch('/api/finance/budgets', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editingId, ...payload }) })
      toast.success('Budget updated')
    } else {
      await fetch('/api/finance/budgets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      toast.success("Got it — I'll keep an eye on that")
    }
    setShowForm(false); setEditingId(null); setForm(defaultForm); load()
  }

  const del = async (id: string) => {
    if (!confirm('Remove this budget?')) return
    await fetch('/api/finance/budgets', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    toast.success('Removed'); load()
  }

  const startEdit = (b: any) => {
    setEditingId(b.id)
    setForm({ category: b.category, amountRSD: b.amountRSD ? String(b.amountRSD) : '', amountEUR: b.amountEUR ? String(b.amountEUR) : '', period: b.period })
    setShowForm(true)
  }

  // Overall picture across every budget, synthesized from real spend vs real limits
  const rows = budgets.flatMap(b => {
    const s = spent[b.category] ?? { rsd: 0, eur: 0 }
    const out: number[] = []
    if (b.amountRSD) out.push(Math.min(100, (s.rsd / b.amountRSD) * 100))
    if (b.amountEUR) out.push(Math.min(100, (s.eur / b.amountEUR) * 100))
    return out
  })
  const overall = rows.length > 0 ? Math.round(rows.reduce((a, b) => a + b, 0) / rows.length) : 0
  const onTrackCount = rows.filter(r => r < 80).length

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-ink tracking-tight">Where your money's going</h1>
        <p className="text-sm text-ink/50 mt-0.5">Set a monthly limit per category and I'll tell you how it's tracking.</p>
      </div>

      {/* Hero: how the whole month is tracking */}
      {budgets.length > 0 && (
        <div className="bg-surface/90 rounded-3xl border border-black/5 dark:border-white/5 shadow-sm p-5 flex items-center gap-5">
          <ScoreRing value={overall} size={92} track="rgb(var(--canvas-alt))" />
          <div>
            <p className="text-sm font-semibold text-ink">
              {onTrackCount === budgets.length
                ? "You're on track across the board this month."
                : `${onTrackCount} of ${budgets.length} ${budgets.length === 1 ? 'budget is' : 'budgets are'} comfortably on track.`}
            </p>
            <p className="text-xs text-ink/40 mt-1">Based on what you've actually spent so far this month.</p>
          </div>
        </div>
      )}

      <button onClick={() => { setEditingId(null); setForm(defaultForm); setShowForm(s => !s) }}
        className="flex items-center justify-center gap-2 w-full bg-[rgb(var(--l-green))] text-white px-4 py-3 rounded-2xl text-sm font-semibold hover:bg-[rgb(var(--l-green))] active:scale-[0.98] transition-all">
        {showForm ? <X size={16} /> : <Plus size={16} />} {showForm ? 'Never mind' : 'Set a new budget'}
      </button>

      {showForm && (
        <div className="bg-surface/90 rounded-3xl border border-black/5 dark:border-white/5 shadow-sm p-5">
          <h3 className="font-semibold text-ink mb-4">{editingId ? 'Update this budget' : "What are we tracking?"}</h3>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="text-xs font-medium text-ink/50">Category</label>
              <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className={inputCls()}>
                <option value="">Pick a category</option>
                {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-ink/50">Per month, in RSD</label>
                <NumberInput value={form.amountRSD} onChange={v => setForm(p => ({ ...p, amountRSD: v }))} className={inputCls()} />
              </div>
              <div>
                <label className="text-xs font-medium text-ink/50">Per month, in EUR</label>
                <NumberInput value={form.amountEUR} onChange={v => setForm(p => ({ ...p, amountEUR: v }))} className={inputCls()} />
              </div>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={submit} className="flex-1 bg-[rgb(var(--l-green))] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[rgb(var(--l-green))]">
              {editingId ? 'Save changes' : "That's the one"}
            </button>
            <button onClick={() => { setShowForm(false); setEditingId(null); setForm(defaultForm) }}
              className="px-5 py-2.5 rounded-xl text-sm text-ink/60 border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {budgets.length === 0 ? (
          <div className="bg-surface/90 rounded-3xl border border-black/5 dark:border-white/5 shadow-sm p-10 text-center">
            <p className="text-ink/60 font-medium">No budgets set yet.</p>
            <p className="text-sm text-ink/40 mt-1">Pick a category you want to keep an eye on and set a monthly limit.</p>
          </div>
        ) : budgets.map(b => {
          const s = spent[b.category] ?? { rsd: 0, eur: 0 }
          const rowPct = b.amountRSD ? (s.rsd / b.amountRSD) * 100 : b.amountEUR ? (s.eur / b.amountEUR) * 100 : 0
          const status = statusWord(rowPct)
          return (
            <div key={b.id} className="bg-surface/90 rounded-2xl border border-black/5 dark:border-white/5 shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="font-semibold text-ink">{b.category}</span>
                  <span className={cn('ml-2 text-xs font-bold', status.tone)}>{status.label}</span>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => startEdit(b)} className="text-ink/30 hover:text-ink p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"><Pencil size={14} /></button>
                  <button onClick={() => del(b.id)} className="text-ink/30 hover:text-[rgb(var(--coral))] p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"><Trash2 size={14} /></button>
                </div>
              </div>
              <div className="space-y-3">
                {[
                  b.amountRSD ? { value: s.rsd, max: b.amountRSD, currency: 'RSD' } : null,
                  b.amountEUR ? { value: s.eur, max: b.amountEUR, currency: 'EUR' } : null,
                ].filter(Boolean).map((row: any, i) => {
                  const pct = row.max > 0 ? Math.min(100, (row.value / row.max) * 100) : 0
                  const st = statusWord(pct)
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-ink/50">{row.value.toLocaleString()} of {row.max.toLocaleString()} {row.currency} spent</span>
                        <span className={cn('font-semibold', st.tone)}>{pct.toFixed(0)}%</span>
                      </div>
                      <div className="h-2 bg-canvas-alt rounded-full overflow-hidden">
                        <div className={cn('h-full rounded-full transition-all duration-700',
                          pct >= 100 ? 'bg-[rgb(var(--coral))]' : pct >= 80 ? 'bg-[rgb(var(--amber))]' : 'bg-emerald-500')}
                          style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
