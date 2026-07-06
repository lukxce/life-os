'use client'
import { useEffect, useState } from 'react'
import { formatRSD, formatEUR } from '@/lib/utils'
import { Plus, Pencil, X, Trash2, Check, Star } from 'lucide-react'

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

  const togglePin = async (acc: any) => {
    setAccounts(prev => prev.map(x => x.id === acc.id ? { ...x, pinned: !acc.pinned } : x))
    await fetch('/api/finance/accounts', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: acc.id, pinned: !acc.pinned })
    })
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
  const inputCls = "mt-1 w-full border border-black/10 dark:border-white/10 rounded-lg px-3 py-2 text-sm bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-[rgb(232,120,90)]"

  const renderCard = (a: any) => (
    <div key={a.id} className="bg-surface/90 border border-black/5 dark:border-white/5 rounded-2xl p-4 shadow-sm">
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
              className={inputCls + ' mt-0'}
            />
            <button onClick={() => saveRename(a)} className="p-1.5 text-emerald-600 hover:bg-emerald-500/10 rounded">
              <Check size={14} />
            </button>
            <button onClick={() => setRenameId(null)} className="p-1.5 text-ink/30 hover:bg-black/5 dark:hover:bg-white/5 rounded">
              <X size={14} />
            </button>
          </div>
        ) : (
          <>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-ink truncate">{a.name}</h3>
              <p className="text-xs text-ink/40">{a.currency} · {a.type}</p>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              <button onClick={() => togglePin(a)}
                className={`p-1.5 rounded ${a.pinned ? 'text-[rgb(220,161,84)]' : 'text-ink/30 hover:text-ink hover:bg-black/5 dark:hover:bg-white/5'}`}
                title={a.pinned ? 'Shown on dashboard — click to hide' : 'Pin to dashboard'}>
                <Star className="w-4 h-4" fill={a.pinned ? 'currentColor' : 'none'} />
              </button>
              <button onClick={() => startRename(a)} className="p-1.5 text-ink/30 hover:text-ink hover:bg-black/5 dark:hover:bg-white/5 rounded" title="Rename">
                <Pencil className="w-4 h-4" />
              </button>
              <button onClick={() => { setEditId(editId === a.id ? null : a.id); setOverrideForm({ ...overrideForm, [a.id]: '' }) }}
                className={`p-1.5 rounded ${editId === a.id ? 'text-[rgb(232,120,90)] bg-[rgb(232,120,90)]/10' : 'text-ink/30 hover:text-ink hover:bg-black/5 dark:hover:bg-white/5'}`} title="Edit balance">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              </button>
              <button onClick={() => deleteAccount(a)} className="p-1.5 text-ink/30 hover:text-[rgb(232,120,90)] hover:bg-[rgb(232,120,90)]/10 rounded" title="Delete">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </>
        )}
      </div>

      <div className="space-y-1 text-sm">
        {a.cryptoAutoSync ? (
          <div className="flex justify-between items-center pt-2">
            <span className="flex items-center gap-1.5 text-ink/80 font-medium">
              Live portfolio
              <span className="text-[10px] font-semibold bg-[rgb(167,120,160)]/15 text-[rgb(167,120,160)] px-1.5 py-0.5 rounded-full">AUTO</span>
            </span>
            <span className="font-bold text-[rgb(167,120,160)] tabular-nums">{fmt(a.currentBalance ?? 0, a.currency)}</span>
          </div>
        ) : (
          <>
            <div className="flex justify-between">
              <span className="text-ink/40">Starting balance</span>
              <span className="text-ink/80 tabular-nums">{fmt(a.startingBalance, a.currency)}</span>
            </div>
            {a.manualOverride != null && (
              <div className="flex justify-between items-center">
                <span className="text-ink/40">Manual override</span>
                <span className="flex items-center gap-2">
                  <span className="font-medium text-[rgb(220,161,84)] tabular-nums">{fmt(a.manualOverride, a.currency)}</span>
                  <button onClick={() => clearOverride(a.id)} className="text-ink/30 hover:text-[rgb(232,120,90)]">
                    <X size={12} />
                  </button>
                </span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-black/5 dark:border-white/5 mt-2">
              <span className="text-ink/70 font-medium">Current</span>
              <span className="font-black text-ink tabular-nums">{fmt(a.currentBalance ?? a.startingBalance, a.currency)}</span>
            </div>
          </>
        )}
      </div>

      {editId === a.id && (
        <div className="mt-4 pt-4 border-t border-black/5 dark:border-white/5 space-y-3">
          <div>
            <label className="text-xs font-medium text-ink/40">Starting balance ({a.currency})</label>
            <input
              type="number"
              defaultValue={a.startingBalance}
              onChange={e => setStartingForm({ ...startingForm, [a.id]: e.target.value })}
              className={inputCls}
            />
            <button onClick={() => saveStarting(a.id)} className="mt-2 w-full bg-emerald-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-emerald-700">
              Update Starting Balance
            </button>
          </div>

          <div className="border-t border-black/5 dark:border-white/5 pt-3">
            <label className="text-xs font-medium text-ink/40">Or set manual override ({a.currency})</label>
            <input
              type="number"
              value={overrideForm[a.id] || ''}
              onChange={e => setOverrideForm({ ...overrideForm, [a.id]: e.target.value })}
              className={inputCls}
              placeholder="e.g. 150000"
            />
            <p className="text-[10px] text-ink/30 mt-1">Override = "as of today my balance is X". Tracks forward from this date.</p>
            <div className="flex gap-2 mt-2">
              <button onClick={() => saveOverride(a.id)} className="flex-1 bg-[rgb(232,120,90)] text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-[rgb(212,100,72)]">Save Override</button>
              <button onClick={() => setEditId(null)} className="flex-1 border border-black/10 dark:border-white/10 text-ink/70 px-3 py-1.5 rounded text-xs font-medium hover:bg-black/5 dark:hover:bg-white/5">Cancel</button>
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
        <h2 className="text-2xl font-black text-ink tracking-tight">Bank Accounts</h2>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center justify-center gap-2 bg-[rgb(232,120,90)] text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[rgb(212,100,72)]">
          <Plus size={16} /> Add Account
        </button>
      </div>

      {showForm && (
        <div className="bg-surface/90 rounded-2xl border border-black/5 dark:border-white/5 shadow-sm p-4 md:p-6">
          <h3 className="font-semibold text-ink mb-4">New Account</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-ink/40">Name</label>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-medium text-ink/40">Starting Balance</label>
              <input type="number" value={form.startingBalance}
                onChange={e => setForm(p => ({ ...p, startingBalance: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-medium text-ink/40">Type</label>
              <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} className={inputCls}>
                {['personal','company'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-ink/40">Currency</label>
              <select value={form.currency} onChange={e => setForm(p => ({ ...p, currency: e.target.value }))} className={inputCls}>
                {['RSD','EUR'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={submit} className="flex-1 sm:flex-initial bg-[rgb(232,120,90)] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[rgb(212,100,72)]">Save</button>
            <button onClick={() => setShowForm(false)} className="flex-1 sm:flex-initial border border-black/10 dark:border-white/10 text-ink/70 px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-black/5 dark:hover:bg-white/5">Cancel</button>
          </div>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-ink/40 uppercase tracking-wide mb-3">Personal</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {personal.map(renderCard)}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-ink/40 uppercase tracking-wide mb-3">Company</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {company.map(renderCard)}
        </div>
      </div>
    </div>
  )
}
