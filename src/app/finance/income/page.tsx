'use client'
import { useEffect, useState } from 'react'
import { formatDate } from '@/lib/utils'
import { Plus, Trash2, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { NumberInput } from '@/components/ui/NumberInput'
import { PullToRefresh } from '@/components/ui/PullToRefresh'

export default function IncomePage() {
  const [entries, setEntries] = useState<any[]>([])
  const [accounts, setAccounts] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'Salary', currency: 'RSD',
    grossAmount: '', deduction: '0',
    client: '', notes: '', accountId: ''
  })

  const load = async () => {
    const [inc, acc] = await Promise.all([
      fetch('/api/finance/income').then(r => r.json()),
      fetch('/api/finance/accounts?simple=1').then(r => r.json()),
    ])
    setEntries(inc); setAccounts(acc)
  }

  useEffect(() => { load() }, [])

  const defaultForm = { date: new Date().toISOString().split('T')[0], type: 'Salary', currency: 'RSD', grossAmount: '', deduction: '0', client: '', notes: '', accountId: '' }

  const startEdit = (entry: any) => {
    setEditingId(entry.id)
    setForm({
      date: new Date(entry.date).toISOString().split('T')[0],
      type: entry.type,
      currency: entry.currency,
      grossAmount: String(entry.grossAmount),
      deduction: String(entry.deduction),
      client: entry.client || '',
      notes: entry.notes || '',
      accountId: entry.accountId || '',
    })
    setShowForm(true)
  }

  const cancel = () => { setShowForm(false); setEditingId(null); setForm(defaultForm) }

  const submit = async () => {
    const payload = { ...form, grossAmount: +form.grossAmount, deduction: +form.deduction }
    if (editingId) {
      await fetch('/api/finance/income', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingId, ...payload })
      })
    } else {
      await fetch('/api/finance/income', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
    }
    setShowForm(false)
    setEditingId(null)
    setForm(defaultForm)
    toast.success(editingId ? 'Income updated' : 'Income saved')
    load()
  }

  const del = async (id: string) => {
    if (!confirm('Delete this entry?')) return
    await fetch('/api/finance/income', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    toast.success('Income deleted')
    load()
  }

  const typeBadge = (type: string) => {
    if (type === 'Salary') return 'bg-blue-100 text-blue-700'
    if (type === 'Invoice') return 'bg-green-100 text-green-700'
    return 'bg-gray-100 text-gray-700 dark:text-gray-300 dark:text-gray-300'
  }

  return (
    <PullToRefresh onRefresh={load}>
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 dark:text-gray-100">Income Log</h2>
        <button onClick={() => { setEditingId(null); setForm(defaultForm); setShowForm(s => !s) }} className="flex items-center justify-center gap-2 bg-[rgb(var(--l-green))] text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[rgb(var(--l-green))]">
          <Plus size={16} /> Add Income
        </button>
      </div>

      {showForm && (
        <div className="bg-surface/90 dark:bg-surface/70 rounded-xl border border-black/10 dark:border-white/10 dark:border-gray-700 dark:border-gray-700 p-4 md:p-6">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 dark:text-gray-100 mb-4">{editingId ? 'Edit Income Entry' : 'New Income Entry'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">Date</label>
              <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                className="mt-1 w-full border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(var(--l-green))]" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">Gross Amount</label>
              <NumberInput value={form.grossAmount} onChange={v => setForm(p => ({ ...p, grossAmount: v }))}
                className="mt-1 w-full border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(var(--l-green))]" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">Deduction</label>
              <NumberInput value={form.deduction} onChange={v => setForm(p => ({ ...p, deduction: v }))}
                className="mt-1 w-full border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(var(--l-green))]" />
            </div>
            {[
              { label: 'Client / Employer', key: 'client' },
              { label: 'Notes', key: 'notes' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">{f.label}</label>
                <input type="text" value={(form as any)[f.key]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  className="mt-1 w-full border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(var(--l-green))]" />
              </div>
            ))}
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">Type</label>
              <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                className="mt-1 w-full border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(var(--l-green))]">
                {['Salary','Invoice','Other'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">Currency</label>
              <select value={form.currency} onChange={e => setForm(p => ({ ...p, currency: e.target.value }))}
                className="mt-1 w-full border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(var(--l-green))]">
                {['RSD','EUR'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="md:col-span-3">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">Account (optional — auto-routed)</label>
              <select value={form.accountId} onChange={e => setForm(p => ({ ...p, accountId: e.target.value }))}
                className="mt-1 w-full border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(var(--l-green))]">
                <option value="">Auto-route</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={submit} className="flex-1 sm:flex-initial bg-[rgb(var(--l-green))] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[rgb(var(--l-green))]">{editingId ? 'Update' : 'Save'}</button>
            <button onClick={cancel} className="flex-1 sm:flex-initial border border-gray-300 dark:border-gray-600 dark:border-gray-600 px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-800 dark:hover:bg-gray-800 dark:bg-gray-800">Cancel</button>
          </div>
        </div>
      )}

      {/* Desktop table */}
      <div className="hidden md:block bg-surface/90 dark:bg-surface/70 rounded-xl border border-black/10 dark:border-white/10 dark:border-gray-700 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 dark:bg-gray-800 dark:bg-gray-800 border-b border-black/10 dark:border-white/10 dark:border-gray-700 dark:border-gray-700">
            <tr>
              {['Date','Type','Currency','Gross','Deduction','Net','Client','Account',''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5 dark:divide-white/5 dark:divide-gray-700">
            {entries.map(e => (
              <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-800 dark:hover:bg-gray-800 dark:bg-gray-800">
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300 dark:text-gray-300">{formatDate(e.date)}</td>
                <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${typeBadge(e.type)}`}>{e.type}</span></td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300 dark:text-gray-300">{e.currency}</td>
                <td className="px-4 py-3 font-medium">{e.grossAmount.toLocaleString()}</td>
                <td className="px-4 py-3 text-red-500">{e.deduction > 0 ? e.deduction.toLocaleString() : '-'}</td>
                <td className="px-4 py-3 font-semibold text-green-600">{e.netAmount.toLocaleString()}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300 dark:text-gray-300">{e.client || '-'}</td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 text-xs">{e.account?.name}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => startEdit(e)} className="text-gray-400 dark:text-gray-500 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-blue-500"><Pencil size={14} /></button>
                    <button onClick={() => del(e.id)} className="text-gray-400 dark:text-gray-500 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-red-500"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {entries.length === 0 && <p className="text-center text-gray-400 dark:text-gray-500 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 py-12">No income entries yet</p>}
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {entries.length === 0 ? (
          <div className="bg-surface/90 dark:bg-surface/70 rounded-xl border border-black/10 dark:border-white/10 dark:border-gray-700 dark:border-gray-700 p-8 text-center text-gray-400 dark:text-gray-500 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">No income entries yet</div>
        ) : entries.map(e => (
          <div key={e.id} className="bg-surface/90 dark:bg-surface/70 rounded-xl border border-black/10 dark:border-white/10 dark:border-gray-700 dark:border-gray-700 p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeBadge(e.type)}`}>{e.type}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">{formatDate(e.date)}</span>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => startEdit(e)} className="text-gray-400 dark:text-gray-500 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-blue-500 p-1"><Pencil size={15} /></button>
                <button onClick={() => del(e.id)} className="text-gray-400 dark:text-gray-500 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-red-500 -mr-1 -mt-1 p-1"><Trash2 size={16} /></button>
              </div>
            </div>
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-lg font-bold text-green-600">{e.netAmount.toLocaleString()} {e.currency}</span>
              {e.deduction > 0 && <span className="text-xs text-red-500">−{e.deduction.toLocaleString()} ded.</span>}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 space-y-0.5">
              <div>Gross: <span className="text-gray-700 dark:text-gray-300 dark:text-gray-300">{e.grossAmount.toLocaleString()} {e.currency}</span></div>
              {e.client && <div>Client: <span className="text-gray-700 dark:text-gray-300 dark:text-gray-300">{e.client}</span></div>}
              {e.account?.name && <div>→ <span className="text-gray-700 dark:text-gray-300 dark:text-gray-300">{e.account.name}</span></div>}
            </div>
          </div>
        ))}
      </div>
    </div>
    </PullToRefresh>
  )
}