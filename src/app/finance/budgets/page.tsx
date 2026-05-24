'use client'
import { useEffect, useState } from 'react'
import { Plus, Trash2, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { NumberInput } from '@/components/ui/NumberInput'

const defaultForm = { category: '', amountRSD: '', amountEUR: '', period: 'month' }

function ProgressBar({ value, max, currency }: { value: number; max: number; currency: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  const color = pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-orange-400' : 'bg-green-500'
  const textColor = pct >= 100 ? 'text-red-600' : pct >= 80 ? 'text-orange-500' : 'text-green-600'
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-500 dark:text-gray-400">{value.toLocaleString()} / {max.toLocaleString()} {currency}</span>
        <span className={`font-semibold ${textColor}`}>{pct.toFixed(0)}%</span>
      </div>
      <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
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
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
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
    const payload = { ...form, amountRSD: form.amountRSD ? +form.amountRSD : null, amountEUR: form.amountEUR ? +form.amountEUR : null }
    if (editingId) {
      await fetch('/api/finance/budgets', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editingId, ...payload }) })
      toast.success('Budget updated')
    } else {
      await fetch('/api/finance/budgets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      toast.success('Budget added')
    }
    setShowForm(false); setEditingId(null); setForm(defaultForm); load()
  }

  const del = async (id: string) => {
    if (!confirm('Delete budget?')) return
    await fetch('/api/finance/budgets', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    toast.success('Deleted'); load()
  }

  const startEdit = (b: any) => {
    setEditingId(b.id)
    setForm({ category: b.category, amountRSD: b.amountRSD ? String(b.amountRSD) : '', amountEUR: b.amountEUR ? String(b.amountEUR) : '', period: b.period })
    setShowForm(true)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Budgets</h2>
        <button onClick={() => { setEditingId(null); setForm(defaultForm); setShowForm(s => !s) }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus size={16} /> Add Budget
        </button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">{editingId ? 'Edit Budget' : 'New Budget'}</h3>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Category</label>
              <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                className="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select category</option>
                {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">RSD limit / month</label>
                <NumberInput value={form.amountRSD} onChange={v => setForm(p => ({ ...p, amountRSD: v }))}
                  className="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">EUR limit / month</label>
                <NumberInput value={form.amountEUR} onChange={v => setForm(p => ({ ...p, amountEUR: v }))}
                  className="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={submit} className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">{editingId ? 'Update' : 'Save'}</button>
            <button onClick={() => { setShowForm(false); setEditingId(null); setForm(defaultForm) }} className="border border-gray-300 dark:border-gray-600 px-5 py-2 rounded-lg text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {budgets.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center text-gray-400 dark:text-gray-500">No budgets yet</div>
        ) : budgets.map(b => {
          const s = spent[b.category] ?? { rsd: 0, eur: 0 }
          return (
            <div key={b.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{b.category}</span>
                  <span className="ml-2 text-xs text-gray-400 dark:text-gray-500 capitalize">{b.period}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => startEdit(b)} className="text-gray-400 hover:text-blue-500 p-1"><Pencil size={14} /></button>
                  <button onClick={() => del(b.id)} className="text-gray-400 hover:text-red-500 p-1"><Trash2 size={14} /></button>
                </div>
              </div>
              <div className="space-y-3">
                {b.amountRSD && <ProgressBar value={s.rsd} max={b.amountRSD} currency="RSD" />}
                {b.amountEUR && <ProgressBar value={s.eur} max={b.amountEUR} currency="EUR" />}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
