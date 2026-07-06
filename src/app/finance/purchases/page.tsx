'use client'
import { useEffect, useState } from 'react'
import { Plus, Trash2, Pencil, ExternalLink, CheckCircle2, Circle } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const PRIORITIES = ['high', 'medium', 'low'] as const
type Priority = typeof PRIORITIES[number]

const PRIORITY_CFG: Record<Priority, { label: string; badge: string; dot: string }> = {
  high:   { label: 'High',   badge: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',    dot: 'bg-red-500'    },
  medium: { label: 'Medium', badge: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300', dot: 'bg-amber-500' },
  low:    { label: 'Low',    badge: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400',    dot: 'bg-gray-400'   },
}

const defaultForm = { name: '', price: '', currency: 'EUR', priority: 'medium' as Priority, category: '', notes: '', url: '' }

export default function PurchasesPage() {
  const [items, setItems] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(defaultForm)
  const [filter, setFilter] = useState<'pending' | 'bought'>('pending')

  const load = async () => {
    const data = await fetch('/api/finance/purchases').then(r => r.json())
    setItems(Array.isArray(data) ? data : [])
  }
  useEffect(() => { load() }, [])

  const submit = async () => {
    if (!form.name.trim()) return
    const payload = { ...form, price: form.price ? +form.price : null }
    if (editingId) {
      await fetch('/api/finance/purchases', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editingId, ...payload }) })
      toast.success('Updated')
    } else {
      await fetch('/api/finance/purchases', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      toast.success('Added to list')
    }
    setShowForm(false); setEditingId(null); setForm(defaultForm); load()
  }

  const toggleBought = async (item: any) => {
    await fetch('/api/finance/purchases', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: item.id, bought: !item.bought }) })
    load()
  }

  const del = async (id: string) => {
    if (!confirm('Remove from list?')) return
    await fetch('/api/finance/purchases', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    toast.success('Removed'); load()
  }

  const startEdit = (item: any) => {
    setEditingId(item.id)
    setForm({ name: item.name, price: item.price ? String(item.price) : '', currency: item.currency, priority: item.priority, category: item.category || '', notes: item.notes || '', url: item.url || '' })
    setShowForm(true)
  }

  const shown = items.filter(i => filter === 'pending' ? !i.bought : i.bought)
  const pendingCount = items.filter(i => !i.bought).length
  const boughtCount = items.filter(i => i.bought).length

  const totalPending = items.filter(i => !i.bought && i.price).reduce((s, i) => s + i.price, 0)

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Purchase List</h2>
        <button onClick={() => { setEditingId(null); setForm(defaultForm); setShowForm(s => !s) }}
          className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-teal-700">
          <Plus size={16} /> Add Item
        </button>
      </div>

      {/* Summary */}
      {pendingCount > 0 && (
        <div className="bg-teal-50 dark:bg-teal-950 border border-teal-200 dark:border-teal-800 rounded-xl p-4 flex items-center justify-between">
          <p className="text-sm text-teal-700 dark:text-teal-300">
            <strong>{pendingCount}</strong> item{pendingCount !== 1 ? 's' : ''} to buy
          </p>
          {totalPending > 0 && (
            <p className="text-sm font-semibold text-teal-700 dark:text-teal-300">
              ≈ {totalPending.toLocaleString('en', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} EUR est.
            </p>
          )}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-surface/90 dark:bg-surface/70 rounded-xl border border-black/10 dark:border-white/10 p-4 md:p-6">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">{editingId ? 'Edit Item' : 'New Item'}</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Item name</label>
              <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Sony WH-1000XM5"
                className="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-gray-800 dark:text-gray-100" />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Est. price</label>
              <input type="number" step="any" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))}
                placeholder="0"
                className="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-gray-800 dark:text-gray-100" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Currency</label>
              <select value={form.currency} onChange={e => setForm(p => ({ ...p, currency: e.target.value }))}
                className="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-gray-800 dark:text-gray-100">
                <option>EUR</option><option>RSD</option><option>USD</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Priority</label>
              <div className="mt-1 flex gap-2">
                {PRIORITIES.map(p => (
                  <button key={p} type="button" onClick={() => setForm(f => ({ ...f, priority: p }))}
                    className={cn('flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors capitalize', form.priority === p ? PRIORITY_CFG[p].badge + ' border-transparent' : 'border-gray-300 dark:border-gray-600 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800')}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Category</label>
              <input type="text" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                placeholder="e.g. Tech, Clothing…"
                className="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-gray-800 dark:text-gray-100" />
            </div>

            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Link (optional)</label>
              <input type="url" value={form.url} onChange={e => setForm(p => ({ ...p, url: e.target.value }))}
                placeholder="https://…"
                className="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-gray-800 dark:text-gray-100" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Notes</label>
              <input type="text" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                className="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-gray-800 dark:text-gray-100" />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={submit} className="flex-1 sm:flex-initial bg-teal-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-teal-700">{editingId ? 'Update' : 'Save'}</button>
            <button onClick={() => { setShowForm(false); setEditingId(null); setForm(defaultForm) }} className="flex-1 sm:flex-initial border border-gray-300 dark:border-gray-600 px-5 py-2.5 rounded-lg text-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
        <button onClick={() => setFilter('pending')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${filter === 'pending' ? 'bg-surface/90 dark:bg-surface/70 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}>
          To Buy <span className="ml-1 text-xs text-gray-400">({pendingCount})</span>
        </button>
        <button onClick={() => setFilter('bought')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${filter === 'bought' ? 'bg-surface/90 dark:bg-surface/70 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}>
          Bought <span className="ml-1 text-xs text-gray-400">({boughtCount})</span>
        </button>
      </div>

      {/* List */}
      <div className="space-y-2">
        {shown.length === 0 ? (
          <div className="bg-surface/90 dark:bg-surface/70 rounded-xl border border-black/10 dark:border-white/10 p-8 text-center text-gray-400 dark:text-gray-500">
            {filter === 'pending' ? 'Nothing on your list yet' : 'No purchased items yet'}
          </div>
        ) : shown.map(item => {
          const cfg = PRIORITY_CFG[item.priority as Priority] ?? PRIORITY_CFG.medium
          return (
            <div key={item.id} className={cn('bg-surface/90 dark:bg-surface/70 rounded-xl border border-black/10 dark:border-white/10 p-4 flex items-start gap-3', item.bought && 'opacity-60')}>
              <button onClick={() => toggleBought(item)} className="mt-0.5 shrink-0 text-gray-400 hover:text-teal-500 transition-colors">
                {item.bought ? <CheckCircle2 size={20} className="text-teal-500" /> : <Circle size={20} />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cn('font-semibold text-gray-900 dark:text-gray-100', item.bought && 'line-through')}>{item.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.badge}`}>{cfg.label}</span>
                  {item.category && <span className="text-xs text-gray-400 dark:text-gray-500">{item.category}</span>}
                </div>
                {item.price && (
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">
                    {item.price.toLocaleString()} {item.currency}
                  </p>
                )}
                {item.notes && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{item.notes}</p>}
                {item.bought && item.boughtAt && (
                  <p className="text-xs text-teal-500 mt-0.5">Bought {new Date(item.boughtAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {item.url && (
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-500 p-1">
                    <ExternalLink size={14} />
                  </a>
                )}
                <button onClick={() => startEdit(item)} className="text-gray-400 hover:text-blue-500 p-1"><Pencil size={14} /></button>
                <button onClick={() => del(item.id)} className="text-gray-400 hover:text-red-500 p-1"><Trash2 size={14} /></button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
