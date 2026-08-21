'use client'
import { useEffect, useState } from 'react'
import { Plus, Trash2, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { NumberInput } from '@/components/ui/NumberInput'

type TypeFilter = 'all' | 'personal' | 'business'

const defaultForm = {
  name: '',
  type: 'personal',
  billingAmount: '',
  billingCurrency: 'EUR',
  category: '',
  subcategory: '',
  accountId: '',
  notes: '',
  active: true,
}

export default function SubscriptionsPage() {
  const [subs, setSubs] = useState<any[]>([])
  const [accounts, setAccounts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [rate, setRate] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [logSub, setLogSub] = useState<any | null>(null)
  const [logAmount, setLogAmount] = useState('')
  const [logCurrency, setLogCurrency] = useState('EUR')
  const [logAccountId, setLogAccountId] = useState('')
  const [form, setForm] = useState(defaultForm)
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')

  const load = async () => {
    const [s, a, c, settings] = await Promise.all([
      fetch('/api/finance/subscriptions').then(r => r.json()),
      fetch('/api/finance/accounts?simple=1').then(r => r.json()),
      fetch('/api/finance/categories').then(r => r.json()),
      fetch('/api/settings').then(r => r.json()),
    ])
    setSubs(Array.isArray(s) ? s : [])
    setAccounts(Array.isArray(a) ? a : [])
    setCategories(Array.isArray(c) ? c : [])
    setRate(settings?.manualRate ?? 0)
  }

  useEffect(() => { load() }, [])

  const submit = async () => {
    const payload = { ...form, billingAmount: +form.billingAmount }
    if (editingId) {
      await fetch('/api/finance/subscriptions', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editingId, ...payload }) })
      toast.success('Subscription updated')
    } else {
      await fetch('/api/finance/subscriptions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      toast.success('Subscription added')
    }
    setShowForm(false); setEditingId(null); setForm(defaultForm); load()
  }

  const del = async (id: string) => {
    if (!confirm('Delete subscription?')) return
    await fetch('/api/finance/subscriptions', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    toast.success('Deleted'); load()
  }

  const startEdit = (s: any) => {
    setEditingId(s.id)
    setForm({
      name: s.name,
      type: s.type || 'personal',
      billingAmount: String(s.billingAmount),
      billingCurrency: s.billingCurrency,
      category: s.category || '',
      subcategory: s.subcategory || '',
      accountId: s.accountId || '',
      notes: s.notes || '',
      active: s.active,
    })
    setShowForm(true)
  }

  const openLogPayment = (s: any) => {
    setLogSub(s)
    setLogAmount(String(s.billingAmount))
    setLogCurrency(s.billingCurrency || 'EUR')
    setLogAccountId(s.accountId || '')
  }

  const logPayment = async () => {
    if (!logSub || !logAmount) return
    if (!logAccountId) {
      toast.error('Select an account to pay from')
      return
    }
    const res = await fetch('/api/finance/expenses', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: new Date().toISOString().split('T')[0],
        type: logSub.type || 'personal',
        category: logSub.category || 'Other',
        subcategory: logSub.subcategory || '',
        description: logSub.name,
        amount: +logAmount,
        currency: logCurrency,
        accountId: logAccountId,
        subscriptionId: logSub.id,
        notes: '',
      })
    })
    if (!res.ok) { toast.error('Failed to log payment'); return }
    toast.success(`${logSub.name} payment logged`)
    setLogSub(null); setLogAmount(''); setLogCurrency('EUR'); setLogAccountId('')
    load()
  }

  // Categories aren't just filtered by name — "Other" exists in both the
  // personal and business sets (same name, different type, per the
  // Category model's @@unique([userId, name, type])), so a name-only match
  // could silently grab the wrong type's subcategories.
  const categoriesForType = categories.filter(c => c.type === form.type)
  const selectedCat = categoriesForType.find(c => c.name === form.category)

  // USD treated as ~0.92 EUR (rough parity); RSD uses manualRate
  const toEur = (s: any) => {
    if (s.billingCurrency === 'EUR') return s.billingAmount
    if (s.billingCurrency === 'USD') return s.billingAmount * 0.92
    return s.billingAmount / (rate || 117.5)
  }

  const activeSubs = subs.filter(s => s.active)
  const personalTotal = activeSubs.filter(s => (s.type || 'personal') === 'personal').reduce((sum, s) => sum + toEur(s), 0)
  const businessTotal = activeSubs.filter(s => s.type === 'business').reduce((sum, s) => sum + toEur(s), 0)

  const filtered = typeFilter === 'all' ? subs : subs.filter(s => (s.type || 'personal') === typeFilter)

  const FILTER_OPTS: { label: string; value: TypeFilter }[] = [
    { label: 'All', value: 'all' },
    { label: 'Personal', value: 'personal' },
    { label: 'Business', value: 'business' },
  ]

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Subscriptions</h2>
        <button onClick={() => { setEditingId(null); setForm(defaultForm); setShowForm(s => !s) }}
          className="flex items-center gap-2 bg-[rgb(var(--l-green))] text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[rgb(var(--l-green))]">
          <Plus size={16} /> Add Subscription
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-ldg-ink/[0.06] dark:bg-ldg-ink/[0.06] border border-ldg-ink/10 dark:border-ldg-ink/10 rounded-xl p-4">
          <p className="text-xs text-ldg-ink/55 dark:text-[rgb(var(--l-green))] font-medium mb-1">Total (active)</p>
          <p className="text-lg font-bold text-ldg-ink/55 dark:text-ldg-ink/55">€{(personalTotal + businessTotal).toFixed(2)}<span className="text-sm font-normal ml-1">/mo</span></p>
          {rate > 0 && <p className="text-xs text-ldg-ink/55 mt-0.5">≈ {Math.round((personalTotal + businessTotal) * rate).toLocaleString()} RSD</p>}
        </div>
        <div className="bg-ldg-ink/[0.06] dark:bg-ldg-ink/[0.06] border border-ldg-ink/10 dark:border-ldg-ink/10 rounded-xl p-4">
          <p className="text-xs text-ldg-ink/55 dark:text-ldg-ink/55 font-medium mb-1">Personal</p>
          <p className="text-lg font-bold text-ldg-ink/55 dark:text-ldg-ink/55">€{personalTotal.toFixed(2)}<span className="text-sm font-normal ml-1">/mo</span></p>
          {rate > 0 && <p className="text-xs text-ldg-ink/55 mt-0.5">≈ {Math.round(personalTotal * rate).toLocaleString()} RSD</p>}
        </div>
        <div className="bg-ldg-ink/[0.06] dark:bg-ldg-ink/[0.06] border border-ldg-ink/10 dark:border-ldg-ink/10 rounded-xl p-4">
          <p className="text-xs text-ldg-ink/55 dark:text-ldg-ink/55 font-medium mb-1">Business</p>
          <p className="text-lg font-bold text-ldg-ink/55 dark:text-ldg-ink/55">€{businessTotal.toFixed(2)}<span className="text-sm font-normal ml-1">/mo</span></p>
          {rate > 0 && <p className="text-xs text-ldg-ink/55 mt-0.5">≈ {Math.round(businessTotal * rate).toLocaleString()} RSD</p>}
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {FILTER_OPTS.map(o => (
          <button
            key={o.value}
            onClick={() => setTypeFilter(o.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              typeFilter === o.value
                ? 'bg-[rgb(var(--l-green))] text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="bg-surface/90 dark:bg-surface/70 rounded-xl border border-black/10 dark:border-white/10 p-4 md:p-6">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">{editingId ? 'Edit Subscription' : 'New Subscription'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Name</label>
              <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                className="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(var(--l-green))] dark:bg-gray-800 dark:text-gray-100" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Type</label>
              <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value, category: '', subcategory: '' }))}
                className="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(var(--l-green))] dark:bg-gray-800 dark:text-gray-100">
                <option value="personal">Personal</option>
                <option value="business">Business</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Billing Amount</label>
              <NumberInput value={form.billingAmount} onChange={v => setForm(p => ({ ...p, billingAmount: v }))}
                className="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(var(--l-green))] dark:bg-gray-800 dark:text-gray-100" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Currency</label>
              <select value={form.billingCurrency} onChange={e => setForm(p => ({ ...p, billingCurrency: e.target.value }))}
                className="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(var(--l-green))] dark:bg-gray-800 dark:text-gray-100">
                <option>EUR</option><option>USD</option><option>RSD</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Category</label>
              <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value, subcategory: '' }))}
                className="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(var(--l-green))] dark:bg-gray-800 dark:text-gray-100">
                <option value="">None</option>
                {categoriesForType.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Subcategory</label>
              <select value={form.subcategory} onChange={e => setForm(p => ({ ...p, subcategory: e.target.value }))}
                className="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(var(--l-green))] dark:bg-gray-800 dark:text-gray-100">
                <option value="">None</option>
                {(selectedCat?.subcategories ?? []).map((s: string) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Account</label>
              <select value={form.accountId} onChange={e => setForm(p => ({ ...p, accountId: e.target.value }))}
                className="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(var(--l-green))] dark:bg-gray-800 dark:text-gray-100">
                <option value="">Select account</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Notes</label>
              <input type="text" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                className="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(var(--l-green))] dark:bg-gray-800 dark:text-gray-100" />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={submit} className="flex-1 sm:flex-initial bg-[rgb(var(--l-green))] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[rgb(var(--l-green))]">{editingId ? 'Update' : 'Save'}</button>
            <button onClick={() => { setShowForm(false); setEditingId(null); setForm(defaultForm) }} className="flex-1 sm:flex-initial border border-gray-300 dark:border-gray-600 px-5 py-2.5 rounded-lg text-sm font-medium dark:text-gray-300">Cancel</button>
          </div>
        </div>
      )}

      {logSub && (
        <div className="bg-surface/90 dark:bg-surface/70 rounded-xl border border-black/10 dark:border-white/10 p-4">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Log payment — {logSub.name}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Amount paid</label>
              <div className="flex mt-1">
                <NumberInput value={logAmount} onChange={setLogAmount} placeholder="Amount"
                  className="flex-1 border border-gray-300 dark:border-gray-600 rounded-l-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(var(--l-green))] dark:bg-gray-800 dark:text-gray-100" />
                <select value={logCurrency} onChange={e => setLogCurrency(e.target.value)}
                  className="border border-l-0 border-gray-300 dark:border-gray-600 rounded-r-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(var(--l-green))] dark:bg-gray-800 dark:text-gray-100">
                  <option>EUR</option><option>USD</option><option>RSD</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Paid from account</label>
              <select value={logAccountId} onChange={e => setLogAccountId(e.target.value)}
                className="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(var(--l-green))] dark:bg-gray-800 dark:text-gray-100">
                <option value="">Select account</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={logPayment} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700">Log</button>
            <button onClick={() => { setLogSub(null); setLogAmount(''); setLogCurrency('EUR'); setLogAccountId('') }}
              className="border border-gray-300 dark:border-gray-600 px-4 py-2 rounded-lg text-sm dark:text-gray-300">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-surface/90 dark:bg-surface/70 rounded-xl border border-black/10 dark:border-white/10 p-8 text-center text-gray-400 dark:text-gray-500">
            {typeFilter === 'all' ? 'No subscriptions yet' : `No ${typeFilter} subscriptions`}
          </div>
        ) : filtered.map(s => (
          <div key={s.id} className={`bg-surface/90 dark:bg-surface/70 rounded-xl border border-black/10 dark:border-white/10 p-4 ${!s.active ? 'opacity-50' : ''}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{s.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    (s.type || 'personal') === 'business'
                      ? 'bg-ldg-ink/[0.06] dark:bg-ldg-ink/[0.06] text-ldg-ink/55 dark:text-ldg-ink/55'
                      : 'bg-ldg-ink/[0.06] dark:bg-ldg-ink/[0.06] text-ldg-ink/55 dark:text-ldg-ink/55'
                  }`}>
                    {(s.type || 'personal') === 'business' ? 'Business' : 'Personal'}
                  </span>
                  {!s.active && <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full">Inactive</span>}
                </div>
                <p className="text-sm text-[rgb(var(--l-green))] dark:text-[rgb(var(--l-green))] font-medium">
                  {s.billingCurrency === 'EUR' ? '€' : s.billingCurrency === 'USD' ? '$' : ''}{s.billingAmount.toLocaleString()} {s.billingCurrency}/month
                  {rate > 0 && s.billingCurrency === 'EUR' && <span className="ml-2 text-xs text-gray-400 dark:text-gray-500 font-normal">≈ {Math.round(s.billingAmount * rate).toLocaleString()} RSD</span>}
                  {rate > 0 && s.billingCurrency === 'USD' && <span className="ml-2 text-xs text-gray-400 dark:text-gray-500 font-normal">≈ €{(s.billingAmount * 0.92).toFixed(2)}</span>}
                  {rate > 0 && s.billingCurrency === 'RSD' && <span className="ml-2 text-xs text-gray-400 dark:text-gray-500 font-normal">≈ €{(s.billingAmount / rate).toFixed(2)}</span>}
                </p>
                {(s.category || s.subcategory) && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{[s.category, s.subcategory].filter(Boolean).join(' › ')}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => openLogPayment(s)} className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-green-700">Log payment</button>
                <button onClick={() => startEdit(s)} className="text-gray-400 hover:text-ldg-green p-1"><Pencil size={15} /></button>
                <button onClick={() => del(s.id)} className="text-gray-400 hover:text-red-500 p-1"><Trash2 size={15} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
