'use client'
import { useEffect, useState } from 'react'
import { formatDate } from '@/lib/utils'
import { Plus, Trash2, ArrowRight, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { NumberInput } from '@/components/ui/NumberInput'

export default function TransfersPage() {
  const [entries, setEntries] = useState<any[]>([])
  const [accounts, setAccounts] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [settings, setSettings] = useState<any>(null)
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    fromAccountId: '', amountSent: '',
    toAccountId: '', notes: ''
  })

  const load = async () => {
    const [tr, acc, set] = await Promise.all([
      fetch('/api/finance/transfers').then(r => r.json()),
      fetch('/api/finance/accounts?simple=1').then(r => r.json()),
      fetch('/api/settings').then(r => r.json()),
    ])
    setEntries(tr); setAccounts(acc); setSettings(set)
  }

  useEffect(() => { load() }, [])

  const companyAccounts = accounts.filter(a => a.type === 'company')
  const personalAccounts = accounts.filter(a => a.type === 'personal')
  const rate = settings?.manualRate ?? 117.5

  const calcReceived = () => {
    const from = accounts.find(a => a.id === form.fromAccountId)
    const to = accounts.find(a => a.id === form.toAccountId)
    if (!from || !to || !form.amountSent) return 0
    const amt = +form.amountSent
    if (from.currency === to.currency) return amt
    if (from.currency === 'EUR' && to.currency === 'RSD') return amt * rate
    if (from.currency === 'RSD' && to.currency === 'EUR') return amt / rate
    return amt
  }

  const defaultForm = { date: new Date().toISOString().split('T')[0], fromAccountId: '', amountSent: '', toAccountId: '', notes: '' }

  const startEdit = (entry: any) => {
    setEditingId(entry.id)
    setForm({
      date: new Date(entry.date).toISOString().split('T')[0],
      fromAccountId: entry.fromAccountId || '',
      amountSent: String(entry.amountSent),
      toAccountId: entry.toAccountId || '',
      notes: entry.notes || '',
    })
    setShowForm(true)
  }

  const cancel = () => { setShowForm(false); setEditingId(null); setForm(defaultForm) }

  const submit = async () => {
    const payload = { ...form, amountSent: +form.amountSent, amountReceived: calcReceived(), rateUsed: rate }
    if (editingId) {
      await fetch('/api/finance/transfers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingId, ...payload })
      })
    } else {
      await fetch('/api/finance/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
    }
    setShowForm(false)
    setEditingId(null)
    setForm(defaultForm)
    toast.success(editingId ? 'Transfer updated' : 'Transfer saved')
    load()
  }

  const del = async (id: string) => {
    if (!confirm('Delete?')) return
    await fetch('/api/finance/transfers', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    toast.success('Transfer deleted')
    load()
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 dark:text-gray-100">Transfers</h2>
        <button onClick={() => { setEditingId(null); setForm(defaultForm); setShowForm(s => !s) }} className="flex items-center justify-center gap-2 bg-teal-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-teal-700">
          <Plus size={16} /> New Transfer
        </button>
      </div>

      {showForm && (
        <div className="bg-white/85 dark:bg-gray-900/70 rounded-xl border border-black/10 dark:border-white/10 dark:border-gray-700 dark:border-gray-700 p-4 md:p-6">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 dark:text-gray-100 mb-4">{editingId ? 'Edit Transfer' : 'Company → Personal Transfer'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">Date</label>
              <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                className="mt-1 w-full border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">Amount Sent</label>
              <NumberInput value={form.amountSent} onChange={v => setForm(p => ({ ...p, amountSent: v }))}
                className="mt-1 w-full border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">From</label>
              <select value={form.fromAccountId} onChange={e => setForm(p => ({ ...p, fromAccountId: e.target.value }))}
                className="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm">
                <option value="">Select account</option>
                {accounts.filter(a => a.id !== form.toAccountId).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">To</label>
              <select value={form.toAccountId} onChange={e => setForm(p => ({ ...p, toAccountId: e.target.value }))}
                className="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm">
                <option value="">Select account</option>
                {accounts.filter(a => a.id !== form.fromAccountId).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">Notes</label>
              <input type="text" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                className="mt-1 w-full border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg px-3 py-2 text-sm" />
            </div>
            {form.amountSent && form.fromAccountId && form.toAccountId && (
              <div className="md:col-span-2 bg-teal-50 border border-teal-200 rounded-lg p-3">
                <p className="text-sm text-teal-700">Amount received: <strong>{calcReceived().toLocaleString()}</strong></p>
              </div>
            )}
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={submit} className="flex-1 sm:flex-initial bg-teal-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium">{editingId ? 'Update' : 'Save'}</button>
            <button onClick={cancel} className="flex-1 sm:flex-initial border border-gray-300 dark:border-gray-600 dark:border-gray-600 px-5 py-2.5 rounded-lg text-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* Desktop table */}
      <div className="hidden md:block bg-white/85 dark:bg-gray-900/70 rounded-xl border border-black/10 dark:border-white/10 dark:border-gray-700 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 dark:bg-gray-800 dark:bg-gray-800 border-b border-black/10 dark:border-white/10 dark:border-gray-700 dark:border-gray-700">
            <tr>
              {['Date','From','Sent','To','Received','Rate','Notes',''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5 dark:divide-white/5 dark:divide-gray-700">
            {entries.map(e => (
              <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-800 dark:hover:bg-gray-800 dark:bg-gray-800">
                <td className="px-4 py-3">{formatDate(e.date)}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300 dark:text-gray-300">{e.fromAccount?.name}</td>
                <td className="px-4 py-3 font-medium">{e.amountSent.toLocaleString()}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300 dark:text-gray-300">{e.toAccount?.name}</td>
                <td className="px-4 py-3 font-medium text-green-600">{e.amountReceived.toLocaleString()}</td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">{e.rateUsed}</td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">{e.notes || '-'}</td>
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
        {entries.length === 0 && <p className="text-center text-gray-400 dark:text-gray-500 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 py-12">No transfers yet</p>}
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {entries.length === 0 ? (
          <div className="bg-white/85 dark:bg-gray-900/70 rounded-xl border border-black/10 dark:border-white/10 dark:border-gray-700 dark:border-gray-700 p-8 text-center text-gray-400 dark:text-gray-500 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">No transfers yet</div>
        ) : entries.map(e => (
          <div key={e.id} className="bg-white/85 dark:bg-gray-900/70 rounded-xl border border-black/10 dark:border-white/10 dark:border-gray-700 dark:border-gray-700 p-4">
            <div className="flex items-start justify-between mb-2">
              <span className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">{formatDate(e.date)}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => startEdit(e)} className="text-gray-400 dark:text-gray-500 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-blue-500 p-1"><Pencil size={15} /></button>
                <button onClick={() => del(e.id)} className="text-gray-400 dark:text-gray-500 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-red-500 -mr-1 -mt-1 p-1"><Trash2 size={16} /></button>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm mb-2">
              <span className="text-gray-700 dark:text-gray-300 dark:text-gray-300 truncate flex-1">{e.fromAccount?.name}</span>
              <ArrowRight size={14} className="text-gray-400 dark:text-gray-500 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 shrink-0" />
              <span className="text-gray-700 dark:text-gray-300 dark:text-gray-300 truncate flex-1 text-right">{e.toAccount?.name}</span>
            </div>
            <div className="flex items-baseline justify-between border-t border-gray-100 dark:border-gray-700 dark:border-gray-700 pt-2 mt-2">
              <span className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">Sent <strong className="text-gray-900 dark:text-gray-100 dark:text-gray-100">{e.amountSent.toLocaleString()}</strong></span>
              <span className="text-sm font-semibold text-green-600">+{e.amountReceived.toLocaleString()}</span>
            </div>
            {e.notes && <div className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-2">{e.notes}</div>}
          </div>
        ))}
      </div>
    </div>
  )
}