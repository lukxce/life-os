'use client'
import { useEffect, useState } from 'react'
import { Plus, Trash2, Pencil, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { NumberInput } from '@/components/ui/NumberInput'

const defaultForm = { name: '', amount: '', currency: 'RSD', category: '', subcategory: '', accountId: '', dayOfMonth: '1', notes: '', isLoan: false, lender: '' }

function daysUntil(dayOfMonth: number): number {
  const now = new Date()
  const due = new Date(now.getFullYear(), now.getMonth(), dayOfMonth)
  if (due < now) due.setMonth(due.getMonth() + 1)
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function isPaidThisMonth(payments: any[]): boolean {
  if (!payments?.length) return false
  const now = new Date()
  const last = new Date(payments[0].paidDate)
  return last.getMonth() === now.getMonth() && last.getFullYear() === now.getFullYear()
}

function statusBadge(days: number, paid: boolean) {
  if (paid) return 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
  if (days < 0) return 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
  if (days <= 3) return 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300'
  if (days <= 7) return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300'
  return 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
}

function equivalent(amount: number, currency: string, rate: number) {
  if (!rate) return null
  if (currency === 'RSD') return `≈ €${(amount / rate).toFixed(2)}`
  return `≈ ${Math.round(amount * rate).toLocaleString()} RSD`
}

export default function BillsPage() {
  const [bills, setBills] = useState<any[]>([])
  const [accounts, setAccounts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [rate, setRate] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [payingBill, setPayingBill] = useState<any | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [form, setForm] = useState(defaultForm)
  const [tab, setTab] = useState<'bills' | 'loans'>('bills')

  const load = async () => {
    const [b, a, c, s] = await Promise.all([
      fetch('/api/finance/bills').then(r => r.json()),
      fetch('/api/finance/accounts').then(r => r.json()),
      fetch('/api/finance/categories').then(r => r.json()),
      fetch('/api/settings').then(r => r.json()),
    ])
    setBills(Array.isArray(b) ? b : [])
    setAccounts(Array.isArray(a) ? a : [])
    setCategories(Array.isArray(c) ? c : [])
    setRate(s?.manualRate ?? 0)
  }

  useEffect(() => { load() }, [])

  const submit = async () => {
    const payload = { ...form, amount: +form.amount, dayOfMonth: +form.dayOfMonth }
    if (editingId) {
      await fetch('/api/finance/bills', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editingId, ...payload }) })
      toast.success(form.isLoan ? 'Loan updated' : 'Bill updated')
    } else {
      await fetch('/api/finance/bills', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      toast.success(form.isLoan ? 'Loan added' : 'Bill added')
    }
    setShowForm(false); setEditingId(null); setForm(defaultForm); load()
  }

  const del = async (id: string) => {
    if (!confirm('Delete?')) return
    await fetch('/api/finance/bills', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    toast.success('Deleted'); load()
  }

  const startEdit = (b: any) => {
    setEditingId(b.id)
    setForm({ name: b.name, amount: String(b.amount), currency: b.currency, category: b.category || '', subcategory: b.subcategory || '', accountId: b.accountId || '', dayOfMonth: String(b.dayOfMonth), notes: b.notes || '', isLoan: b.isLoan ?? false, lender: b.lender || '' })
    setTab(b.isLoan ? 'loans' : 'bills')
    setShowForm(true)
  }

  const markPaid = async () => {
    if (!payingBill) return
    await fetch('/api/finance/bills/pay', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ billId: payingBill.id, amount: +(payAmount || payingBill.amount), accountId: payingBill.accountId, category: payingBill.category, subcategory: payingBill.subcategory })
    })
    toast.success(`${payingBill.name} marked as paid`)
    setPayingBill(null); setPayAmount(''); load()
  }

  const allBills = [...bills].filter(b => !b.isLoan).sort((a, b) => daysUntil(a.dayOfMonth) - daysUntil(b.dayOfMonth))
  const allLoans = [...bills].filter(b => b.isLoan).sort((a, b) => daysUntil(a.dayOfMonth) - daysUntil(b.dayOfMonth))
  const shown = tab === 'bills' ? allBills : allLoans

  const totalMonthly = (tab === 'bills' ? allBills : allLoans).filter(b => b.active).reduce((s, b) => s + b.amount, 0)
  const totalCurrency = shown[0]?.currency ?? 'RSD'

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Bills & Loans</h2>
        <button onClick={() => { setEditingId(null); setForm({ ...defaultForm, isLoan: tab === 'loans' }); setShowForm(s => !s) }}
          className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-teal-700">
          <Plus size={16} /> Add {tab === 'bills' ? 'Bill' : 'Loan'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
        {(['bills', 'loans'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${tab === t ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
            {t} <span className="ml-1 text-xs text-gray-400">({t === 'bills' ? allBills.length : allLoans.length})</span>
          </button>
        ))}
      </div>

      {shown.length > 0 && (
        <div className="bg-teal-50 dark:bg-teal-950 border border-teal-200 dark:border-teal-800 rounded-xl p-4">
          <p className="text-sm text-teal-700 dark:text-teal-300">
            Total monthly {tab}: <strong>{totalMonthly.toLocaleString()} {totalCurrency}</strong>
            {rate > 0 && <span className="ml-2 text-teal-500 dark:text-teal-400">{equivalent(totalMonthly, totalCurrency, rate)}</span>}
          </p>
        </div>
      )}

      {showForm && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 md:p-6">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">{editingId ? `Edit ${form.isLoan ? 'Loan' : 'Bill'}` : `New ${tab === 'loans' ? 'Loan' : 'Bill'}`}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Name</label>
              <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                className="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            {(tab === 'loans' || form.isLoan) && (
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Lender</label>
                <input type="text" value={form.lender} onChange={e => setForm(p => ({ ...p, lender: e.target.value }))}
                  placeholder="e.g. Erste Bank"
                  className="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Monthly Amount</label>
              <NumberInput value={form.amount} onChange={v => setForm(p => ({ ...p, amount: v }))}
                className="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Currency</label>
              <select value={form.currency} onChange={e => setForm(p => ({ ...p, currency: e.target.value }))}
                className="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>RSD</option><option>EUR</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Due Day of Month</label>
              <input type="number" min="1" max="31" value={form.dayOfMonth} onChange={e => setForm(p => ({ ...p, dayOfMonth: e.target.value }))}
                className="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Category</label>
              <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value, subcategory: '' }))}
                className="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">None</option>
                {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Account</label>
              <select value={form.accountId} onChange={e => setForm(p => ({ ...p, accountId: e.target.value }))}
                className="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select account</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={submit} className="flex-1 sm:flex-initial bg-teal-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-teal-700">{editingId ? 'Update' : 'Save'}</button>
            <button onClick={() => { setShowForm(false); setEditingId(null); setForm(defaultForm) }} className="flex-1 sm:flex-initial border border-gray-300 dark:border-gray-600 px-5 py-2.5 rounded-lg text-sm">Cancel</button>
          </div>
        </div>
      )}

      {payingBill && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Mark as paid — {payingBill.name}</h3>
          <div className="flex gap-3">
            <NumberInput value={payAmount || String(payingBill.amount)} onChange={setPayAmount} placeholder={String(payingBill.amount)}
              className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <button onClick={markPaid} className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700">Confirm</button>
            <button onClick={() => { setPayingBill(null); setPayAmount('') }} className="border border-gray-300 dark:border-gray-600 px-4 py-2 rounded-lg text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {shown.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center text-gray-400 dark:text-gray-500">
            No {tab} yet
          </div>
        ) : shown.map(b => {
          const days = daysUntil(b.dayOfMonth)
          const paid = isPaidThisMonth(b.payments)
          const eq = rate > 0 ? equivalent(b.amount, b.currency, rate) : null
          return (
            <div key={b.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{b.name}</span>
                    {b.lender && <span className="text-xs text-gray-400 dark:text-gray-500">{b.lender}</span>}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge(days, paid)}`}>
                      {paid ? 'Paid this month' : days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'Due today' : `${days}d left`}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                    {b.amount.toLocaleString()} {b.currency}
                    {eq && <span className="ml-2 text-xs text-gray-400 dark:text-gray-500 font-normal">{eq}</span>}
                    <span className="ml-2 text-xs text-gray-400 font-normal">· due day {b.dayOfMonth}</span>
                  </p>
                  {b.category && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{b.category}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!paid && (
                    <button onClick={() => { setPayingBill(b); setPayAmount(String(b.amount)) }}
                      className="bg-teal-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-teal-700 flex items-center gap-1">
                      <CheckCircle size={12} /> Mark paid
                    </button>
                  )}
                  <button onClick={() => startEdit(b)} className="text-gray-400 hover:text-blue-500 p-1"><Pencil size={15} /></button>
                  <button onClick={() => del(b.id)} className="text-gray-400 hover:text-red-500 p-1"><Trash2 size={15} /></button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
