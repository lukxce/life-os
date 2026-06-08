'use client'
import { useEffect, useState } from 'react'
import { formatRSD, formatEUR } from '@/lib/utils'
import { Plus, Pencil, X, Trash2, Check } from 'lucide-react'

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [renameId, setRenameId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [form, setForm] = useState({ name: '', type: 'personal', currency: 'RSD', startingBalance: '0' })
  const [overrideForm, setOverrideForm] = useState<{ [id: string]: string }>({})
  const [startingForm, setStartingForm] = useState<{ [id: string]: string }>({})

  const load = async () => {
    const acc = await fetch('/api/finance/accounts').then(r => r.json())
    setAccounts(acc)
  }
  useEffect(() => { load() }, [])

  const submit = async () => {
    await fetch('/api/finance/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, startingBalance: +form.startingBalance })
    })
    setShowForm(false)
    setForm({ name: '', type: 'personal', currency: 'RSD', startingBalance: '0' })
    load()
  }

  const saveOverride = async (id: string) => {
    await fetch('/api/finance/accounts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, manualOverride: +overrideForm[id], overrideDate: new Date() })
    })
    setEditId(null)
    load()
  }

  const clearOverride = async (id: string) => {
    await fetch('/api/finance/accounts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, manualOverride: null, overrideDate: null })
    })
    load()
  }

  const saveStarting = async (id: string) => {
    const value = startingForm[id]
    if (value === undefined || value === '') return
    await fetch('/api/finance/accounts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, startingBalance: +value })
    })
    setEditId(null)
    load()
  }

  const startRename = (acc: any) => {
    setRenameId(acc.id)
    setRenameValue(acc.name)
  }

  const saveRename = async (acc: any) => {
    const newName = renameValue.trim()
    if (!newName || newName === acc.name) {
      setRenameId(null)
      return
    }
    await fetch('/api/finance/accounts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: acc.id, name: newName })
    })
    setRenameId(null)
    setRenameValue('')
    load()
  }

  const deleteAccount = async (acc: any) => {
    const confirmed = confirm(`Delete "${acc.name}"?\n\nThis will fail if the account has any income, expenses, transfers, or conversions linked to it. You'll need to delete those first.`)
    if (!confirmed) return
    try {
      const res = await fetch('/api/finance/accounts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: acc.id })
      })
      if (!res.ok) {
        alert('Could not delete — the account likely has linked transactions. Delete those first.')
        return
      }
      load()
    } catch {
      alert('Delete failed.')
    }
  }

  const fmt = (val: number, currency: string) => currency === 'RSD' ? formatRSD(val) : formatEUR(val)

  const renderCard = (a: any) => (
    <div key={a.id} className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-start justify-between gap-2 mb-3">
        {renameId === a.id ? (
          <div className="flex items-center gap-2 flex-1">
            <input
              autoFocus
              value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') saveRename(a)
                if (e.key === 'Escape') setRenameId(null)
              }}
              className="flex-1 border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button onClick={() => saveRename(a)} className="p-1.5 text-green-600 hover:bg-green-50 rounded">
              <Check size={14} />
            </button>
            <button onClick={() => setRenameId(null)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded">
              <X size={14} />
            </button>
          </div>
        ) : (
          <>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-gray-900 truncate">{a.name}</h3>
              <p className="text-xs text-gray-500">{a.currency} · {a.type}</p>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              <button onClick={() => startRename(a)} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded" title="Rename">
                <Pencil className="w-4 h-4" />
              </button>
              <button onClick={() => { setEditId(editId === a.id ? null : a.id); setOverrideForm({ ...overrideForm, [a.id]: '' }) }}
                className={`p-1.5 rounded ${editId === a.id ? 'text-blue-700 bg-blue-50' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'}`} title="Edit balance">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              </button>
              <button onClick={() => deleteAccount(a)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded" title="Delete">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </>
        )}
      </div>

      <div className="space-y-1 text-sm">
        {a.cryptoAutoSync ? (
          <div className="flex justify-between items-center pt-2">
            <span className="flex items-center gap-1.5 text-gray-700 font-medium">
              Live portfolio
              <span className="text-[10px] font-semibold bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full">AUTO</span>
            </span>
            <span className="font-bold text-purple-600">{fmt(a.currentBalance ?? 0, a.currency)}</span>
          </div>
        ) : (
          <>
            <div className="flex justify-between">
              <span className="text-gray-500">Starting balance</span>
              <span>{fmt(a.startingBalance, a.currency)}</span>
            </div>
            {a.manualOverride != null && (
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Manual override</span>
                <span className="flex items-center gap-2">
                  <span className="font-medium text-orange-600">{fmt(a.manualOverride, a.currency)}</span>
                  <button onClick={() => clearOverride(a.id)} className="text-gray-400 hover:text-red-500">
                    <X size={12} />
                  </button>
                </span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-gray-100 mt-2">
              <span className="text-gray-700 font-medium">Current</span>
              <span className="font-bold text-gray-900">{fmt(a.currentBalance ?? a.startingBalance, a.currency)}</span>
            </div>
          </>
        )}
      </div>

      {editId === a.id && (
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-500">Starting balance ({a.currency})</label>
            <input
              type="number"
              defaultValue={a.startingBalance}
              onChange={e => setStartingForm({ ...startingForm, [a.id]: e.target.value })}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button onClick={() => saveStarting(a.id)} className="mt-2 w-full bg-green-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-green-700">
              Update Starting Balance
            </button>
          </div>

          <div className="border-t border-gray-100 pt-3">
            <label className="text-xs font-medium text-gray-500">Or set manual override ({a.currency})</label>
            <input
              type="number"
              value={overrideForm[a.id] || ''}
              onChange={e => setOverrideForm({ ...overrideForm, [a.id]: e.target.value })}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. 150000"
            />
            <p className="text-[10px] text-gray-400 mt-1">Override = "as of today my balance is X". Tracks forward from this date.</p>
            <div className="flex gap-2 mt-2">
              <button onClick={() => saveOverride(a.id)} className="flex-1 bg-blue-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-blue-700">Save Override</button>
              <button onClick={() => setEditId(null)} className="flex-1 border border-gray-300 px-3 py-1.5 rounded text-xs font-medium hover:bg-gray-50">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  const personal = accounts.filter(a => a.type === 'personal')
  const company = accounts.filter(a => a.type === 'company')

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-2xl font-bold text-gray-900">Bank Accounts</h2>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus size={16} /> Add Account
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
          <h3 className="font-semibold text-gray-900 mb-4">New Account</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500">Name</label>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Starting Balance</label>
              <input type="number" value={form.startingBalance}
                onChange={e => setForm(p => ({ ...p, startingBalance: e.target.value }))}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Type</label>
              <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {['personal','company'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Currency</label>
              <select value={form.currency} onChange={e => setForm(p => ({ ...p, currency: e.target.value }))}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {['RSD','EUR'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={submit} className="flex-1 sm:flex-initial bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700">Save</button>
            <button onClick={() => setShowForm(false)} className="flex-1 sm:flex-initial border border-gray-300 px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Personal</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {personal.map(renderCard)}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Company</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {company.map(renderCard)}
        </div>
      </div>
    </div>
  )
}