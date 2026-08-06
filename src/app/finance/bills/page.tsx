'use client'
import { useEffect, useState } from 'react'
import { Plus, Trash2, Pencil, CheckCircle, CalendarDays } from 'lucide-react'
import { toast } from 'sonner'
import { NumberInput } from '@/components/ui/NumberInput'
import { cn } from '@/lib/utils'
import { Card, SolidBtn } from '@/components/ledger/primitives'

const defaultForm = { name: '', amount: '', currency: 'RSD', category: '', subcategory: '', accountId: '', dayOfMonth: '1', notes: '', isLoan: false, lender: '', loanEndDate: '', type: 'personal' }

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
  if (paid) return 'bg-ldg-green/10 text-ldg-green'
  if (days <= 3) return 'bg-ldg-urgent/[0.08] text-ldg-urgent'
  return 'bg-ldg-ink/[0.06] text-ldg-ink/55'
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
  const [tab, setTab] = useState<'bills' | 'loans' | 'calendar'>('bills')
  const [typeFilter, setTypeFilter] = useState<'all' | 'personal' | 'company'>('all')

  const load = async () => {
    const [b, a, c, s] = await Promise.all([
      fetch('/api/finance/bills').then(r => r.json()),
      fetch('/api/finance/accounts?simple=1').then(r => r.json()),
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
    const res = editingId
      ? await fetch('/api/finance/bills', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editingId, ...payload }) })
      : await fetch('/api/finance/bills', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    if (!res.ok) {
      toast.error(`Failed to save — ${await res.text().catch(() => 'server error')}`)
      return
    }
    toast.success(editingId ? (form.isLoan ? 'Loan updated' : 'Bill updated') : (form.isLoan ? 'Loan added' : 'Bill added'))
    setShowForm(false); setEditingId(null); setForm(defaultForm); load()
  }

  const del = async (id: string) => {
    if (!confirm('Delete?')) return
    await fetch('/api/finance/bills', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    toast.success('Deleted'); load()
  }

  const startEdit = (b: any) => {
    setEditingId(b.id)
    setForm({ name: b.name, amount: String(b.amount), currency: b.currency, category: b.category || '', subcategory: b.subcategory || '', accountId: b.accountId || '', dayOfMonth: String(b.dayOfMonth), notes: b.notes || '', isLoan: b.isLoan ?? false, lender: b.lender || '', loanEndDate: b.loanEndDate ? new Date(b.loanEndDate).toISOString().split('T')[0] : '', type: b.type || 'personal' })
    setTab(b.isLoan ? 'loans' : 'bills')
    setShowForm(true)
  }

  const [payAccountId, setPayAccountId] = useState('')

  const markPaid = async () => {
    if (!payingBill) return
    const res = await fetch('/api/finance/bills/pay', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ billId: payingBill.id, amount: +(payAmount || payingBill.amount), accountId: payAccountId || payingBill.accountId, category: payingBill.category, subcategory: payingBill.subcategory })
    })
    if (!res.ok) {
      const data = await res.json().catch(() => null)
      toast.error(data?.error || 'Failed to mark as paid — try again')
      return
    }
    toast.success(`${payingBill.name} marked as paid`)
    setPayingBill(null); setPayAmount(''); setPayAccountId(''); load()
  }

  // Category.type uses 'personal' | 'business', Bill.type uses 'personal' | 'company'.
  const categoryType = form.type === 'company' ? 'business' : 'personal'
  const typeCategories = categories.filter((c: any) => c.type === categoryType)
  const selectedCat = categories.find((c: any) => c.name === form.category)
  const subcats: string[] = selectedCat?.subcategories ?? []

  const allBills = [...bills].filter(b => !b.isLoan).sort((a, b) => daysUntil(a.dayOfMonth) - daysUntil(b.dayOfMonth))
  const allLoans = [...bills].filter(b => b.isLoan).sort((a, b) => daysUntil(a.dayOfMonth) - daysUntil(b.dayOfMonth))
  const baseList = tab === 'bills' ? allBills : allLoans
  const filtered = typeFilter === 'all' ? baseList : baseList.filter(b => (b.type || 'personal') === typeFilter)
  const shown = tab === 'calendar' ? [] : filtered

  const totalMonthly = filtered.filter(b => b.active).reduce((s, b) => s + b.amount, 0)
  const totalCurrency = filtered[0]?.currency ?? 'RSD'

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-2xl font-bold text-ldg-ink">Bills & Loans</h2>
        <SolidBtn onClick={() => { setEditingId(null); setForm({ ...defaultForm, isLoan: tab === 'loans' }); if (tab === 'calendar') setTab('bills'); setShowForm(s => !s) }}>
          <span className="flex items-center gap-2"><Plus size={16} /> Add {tab === 'loans' ? 'Loan' : 'Bill'}</span>
        </SolidBtn>
      </div>

      {/* Tabs + type filter */}
      <div className="flex flex-wrap items-center gap-3">
      <div className="flex gap-1 bg-ldg-ink/[0.05] p-1 rounded-lg w-fit">
        {(['bills', 'loans'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${tab === t ? 'bg-ldg-card text-ldg-ink shadow-sm' : 'text-ldg-ink/55 hover:text-ldg-ink/80'}`}>
            {t} <span className="ml-1 text-xs text-ldg-ink/40">({t === 'bills' ? allBills.length : allLoans.length})</span>
          </button>
        ))}
        <button onClick={() => setTab('calendar')}
          className={cn('flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
            tab === 'calendar' ? 'bg-ldg-card text-ldg-ink shadow-sm' : 'text-ldg-ink/55 hover:text-ldg-ink/80')}>
          <CalendarDays size={14} /> Calendar
        </button>
      </div>

      {/* Personal / Company filter */}
      {tab !== 'calendar' && (
        <div className="flex gap-1">
          {(['all', 'personal', 'company'] as const).map(t => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors capitalize ${typeFilter === t ? 'bg-ldg-green/10 text-ldg-green border border-ldg-green/30' : 'bg-ldg-ink/[0.05] text-ldg-ink/55 hover:text-ldg-ink/80'}`}>
              {t}
            </button>
          ))}
        </div>
      )}
      </div>

      {shown.length > 0 && (
        <Card className="p-4" accent="green">
          <p className="text-sm text-ldg-ink">
            Total monthly {tab}: <strong className="font-mono">{totalMonthly.toLocaleString()} {totalCurrency}</strong>
            {rate > 0 && <span className="ml-2 font-mono text-ldg-ink/55">{equivalent(totalMonthly, totalCurrency, rate)}</span>}
          </p>
        </Card>
      )}

      {showForm && (
        <div className="bg-ldg-card rounded-2xl border border-ldg-ink/10 p-4 md:p-6">
          <h3 className="font-semibold text-ldg-ink mb-4">{editingId ? `Edit ${form.isLoan ? 'Loan' : 'Bill'}` : `New ${tab === 'loans' ? 'Loan' : 'Bill'}`}</h3>
          <div className="grid grid-cols-2 gap-4">
            {/* Row 1: Name + Lender (loans) or Monthly Amount (bills) */}
            <div>
              <label className="text-xs font-medium text-ldg-ink/55">Name</label>
              <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                className="mt-1 w-full border border-ldg-ink/10 rounded-lg px-3 py-2 text-sm focus:outline-none text-ldg-ink" />
            </div>
            {(tab === 'loans' || form.isLoan) ? (
              <div>
                <label className="text-xs font-medium text-ldg-ink/55">Lender</label>
                <input type="text" value={form.lender} onChange={e => setForm(p => ({ ...p, lender: e.target.value }))}
                  placeholder="e.g. Erste Bank"
                  className="mt-1 w-full border border-ldg-ink/10 rounded-lg px-3 py-2 text-sm focus:outline-none text-ldg-ink" />
              </div>
            ) : (
              <div>
                <label className="text-xs font-medium text-ldg-ink/55">Monthly Amount</label>
                <NumberInput value={form.amount} onChange={v => setForm(p => ({ ...p, amount: v }))}
                  className="mt-1 w-full border border-ldg-ink/10 rounded-lg px-3 py-2 text-sm focus:outline-none text-ldg-ink" />
              </div>
            )}

            {/* Row 2: Monthly Amount + Currency (loans) | Currency + Due Day (bills) */}
            {(tab === 'loans' || form.isLoan) && (
              <div>
                <label className="text-xs font-medium text-ldg-ink/55">Monthly Amount</label>
                <NumberInput value={form.amount} onChange={v => setForm(p => ({ ...p, amount: v }))}
                  className="mt-1 w-full border border-ldg-ink/10 rounded-lg px-3 py-2 text-sm focus:outline-none text-ldg-ink" />
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-ldg-ink/55">Currency</label>
              <select value={form.currency} onChange={e => setForm(p => ({ ...p, currency: e.target.value }))}
                className="mt-1 w-full border border-ldg-ink/10 rounded-lg px-3 py-2 text-sm focus:outline-none text-ldg-ink">
                <option>RSD</option><option>EUR</option>
              </select>
            </div>

            {/* Row 3: Due Day + Loan End Date (loans) | Due Day + Category (bills) */}
            <div>
              <label className="text-xs font-medium text-ldg-ink/55">Payment Day of Month</label>
              <input type="number" min="1" max="31" value={form.dayOfMonth} onChange={e => setForm(p => ({ ...p, dayOfMonth: e.target.value }))}
                className="mt-1 w-full border border-ldg-ink/10 rounded-lg px-3 py-2 text-sm focus:outline-none text-ldg-ink" />
            </div>
            {(tab === 'loans' || form.isLoan) ? (
              <div>
                <label className="text-xs font-medium text-ldg-ink/55">Loan End Date</label>
                <input type="date" value={form.loanEndDate} onChange={e => setForm(p => ({ ...p, loanEndDate: e.target.value }))}
                  className="mt-1 w-full border border-ldg-ink/10 rounded-lg px-3 py-2 text-sm focus:outline-none text-ldg-ink" />
              </div>
            ) : (
              <div>
                <label className="text-xs font-medium text-ldg-ink/55">Category</label>
                <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value, subcategory: '' }))}
                  className="mt-1 w-full border border-ldg-ink/10 rounded-lg px-3 py-2 text-sm focus:outline-none text-ldg-ink">
                  <option value="">None</option>
                  {typeCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
            )}

            {/* Row 4: Category + Account (loans) | Account alone (bills) */}
            {(tab === 'loans' || form.isLoan) && (
              <div>
                <label className="text-xs font-medium text-ldg-ink/55">Category</label>
                <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value, subcategory: '' }))}
                  className="mt-1 w-full border border-ldg-ink/10 rounded-lg px-3 py-2 text-sm focus:outline-none text-ldg-ink">
                  <option value="">None</option>
                  {typeCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-ldg-ink/55">Account</label>
              <select value={form.accountId} onChange={e => setForm(p => ({ ...p, accountId: e.target.value }))}
                className="mt-1 w-full border border-ldg-ink/10 rounded-lg px-3 py-2 text-sm focus:outline-none text-ldg-ink">
                <option value="">Select account</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>

            {/* Personal / Company toggle */}
            <div className="col-span-2">
              <label className="text-xs font-medium text-ldg-ink/55">Type</label>
              <div className="mt-1 flex gap-2">
                {(['personal', 'company'] as const).map(t => (
                  <button key={t} type="button" onClick={() => setForm(p => ({ ...p, type: t, category: '', subcategory: '' }))}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors capitalize ${form.type === t ? 'bg-ldg-green border-ldg-green text-white' : 'border-ldg-ink/10 text-ldg-ink/70 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {subcats.length > 0 && (
              <div className="col-span-2">
                <label className="text-xs font-medium text-ldg-ink/55">Subcategory</label>
                <select value={form.subcategory} onChange={e => setForm(p => ({ ...p, subcategory: e.target.value }))}
                  className="mt-1 w-full border border-ldg-ink/10 rounded-lg px-3 py-2 text-sm focus:outline-none text-ldg-ink">
                  <option value="">None</option>
                  {subcats.map((s: string) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={submit} className="flex-1 sm:flex-initial bg-ldg-green text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:opacity-90">{editingId ? 'Update' : 'Save'}</button>
            <button onClick={() => { setShowForm(false); setEditingId(null); setForm(defaultForm) }} className="flex-1 sm:flex-initial border border-ldg-ink/10 px-5 py-2.5 rounded-lg text-sm">Cancel</button>
          </div>
        </div>
      )}

      {payingBill && (
        <div className="bg-ldg-card rounded-2xl border border-ldg-ink/10 p-4">
          <h3 className="font-semibold text-ldg-ink mb-3">Mark as paid — {payingBill.name}</h3>
          <div className="flex flex-wrap gap-3">
            <NumberInput value={payAmount || String(payingBill.amount)} onChange={setPayAmount} placeholder={String(payingBill.amount)}
              className="flex-1 min-w-[120px] border border-ldg-ink/10 rounded-lg px-3 py-2 text-sm focus:outline-none" />
            <select value={payAccountId} onChange={e => setPayAccountId(e.target.value)}
              className="flex-1 min-w-[160px] border border-ldg-ink/10 rounded-lg px-3 py-2 text-sm focus:outline-none text-ldg-ink">
              <option value="">Select account</option>
              {accounts.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <button onClick={markPaid} className="bg-ldg-green text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">Confirm</button>
            <button onClick={() => { setPayingBill(null); setPayAmount(''); setPayAccountId('') }} className="border border-ldg-ink/10 px-4 py-2 rounded-lg text-sm">Cancel</button>
          </div>
          {!payAccountId && <p className="text-xs text-ldg-urgent mt-2">Pick an account before confirming.</p>}
        </div>
      )}

      {tab === 'calendar' ? (
        <BillCalendar bills={bills} rate={rate} onMarkPaid={b => { setPayingBill(b); setPayAmount(String(b.amount)); setPayAccountId(b.accountId || '') }} />
      ) : (
      <div className="space-y-3">
        {shown.length === 0 ? (
          <div className="bg-ldg-card rounded-2xl border border-ldg-ink/10 p-8 text-center text-ldg-ink/40">
            No {tab} yet
          </div>
        ) : shown.map(b => {
          const days = daysUntil(b.dayOfMonth)
          const paid = isPaidThisMonth(b.payments)
          const eq = rate > 0 ? equivalent(b.amount, b.currency, rate) : null
          return (
            <div key={b.id} className="bg-ldg-card rounded-2xl border border-ldg-ink/10 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-semibold text-ldg-ink">{b.name}</span>
                    {b.lender && <span className="text-xs text-ldg-ink/40">{b.lender}</span>}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge(days, paid)}`}>
                      {paid ? 'Paid this month' : days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'Due today' : `${days}d left`}
                    </span>
                    {b.type === 'company' && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-ldg-ink/[0.06] dark:bg-ldg-ink/[0.06] text-ldg-ink/55 dark:text-ldg-ink/55">company</span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-ldg-ink/70">
                    {b.amount.toLocaleString()} {b.currency}
                    {eq && <span className="ml-2 text-xs text-ldg-ink/40 font-normal">{eq}</span>}
                    <span className="ml-2 text-xs text-ldg-ink/40 font-normal">· due day {b.dayOfMonth}</span>
                  </p>
                  {b.category && <p className="text-xs text-ldg-ink/55 mt-0.5">{b.category}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!paid && (
                    <button onClick={() => { setPayingBill(b); setPayAmount(String(b.amount)); setPayAccountId(b.accountId || '') }}
                      className="bg-ldg-green text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-90 flex items-center gap-1">
                      <CheckCircle size={12} /> Mark paid
                    </button>
                  )}
                  <button onClick={() => startEdit(b)} className="text-ldg-ink/40 hover:text-ldg-green p-1"><Pencil size={15} /></button>
                  <button onClick={() => del(b.id)} className="text-ldg-ink/40 hover:text-ldg-urgent p-1"><Trash2 size={15} /></button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      )}
    </div>
  )
}

function BillCalendar({ bills, rate, onMarkPaid }: { bills: any[]; rate: number; onMarkPaid: (b: any) => void }) {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const monthName = now.toLocaleString('en-US', { month: 'long', year: 'numeric' })

  const activeBills = bills.filter(b => b.active)

  function isPaidThisMonth(payments: any[]): boolean {
    if (!payments?.length) return false
    const last = new Date(payments[0].paidDate)
    return last.getMonth() === month && last.getFullYear() === year
  }

  // Build day → bills map
  const dayMap: Record<number, any[]> = {}
  for (const b of activeBills) {
    const d = Math.min(b.dayOfMonth, daysInMonth)
    if (!dayMap[d]) dayMap[d] = []
    dayMap[d].push(b)
  }

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  // Total for the month
  const totalRSD = activeBills.filter(b => b.currency === 'RSD').reduce((s, b) => s + b.amount, 0)
  const totalEUR = activeBills.filter(b => b.currency === 'EUR').reduce((s, b) => s + b.amount, 0)
  const totalRSDEq = totalRSD + totalEUR * rate

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-ldg-ink">{monthName}</h3>
        <div className="text-sm text-ldg-ink/55">
          Total: <span className="font-semibold text-ldg-ink">
            {Math.round(totalRSDEq).toLocaleString()} RSD
          </span>
          {totalEUR > 0 && <span className="ml-1">+ {totalEUR.toLocaleString()} EUR</span>}
        </div>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {['M','T','W','T','F','S','S'].map((d, i) => (
          <div key={i} className="text-center text-[10px] font-semibold text-ldg-ink/40 py-1">{d}</div>
        ))}

        {/* Offset for first day of month */}
        {(() => {
          const firstDay = new Date(year, month, 1).getDay()
          const offset = firstDay === 0 ? 6 : firstDay - 1 // Mon-start
          return Array.from({ length: offset }, (_, i) => <div key={`off-${i}`} />)
        })()}

        {days.map(day => {
          const billsOnDay = dayMap[day] ?? []
          const isToday = day === now.getDate()
          const hasBills = billsOnDay.length > 0
          const allPaid = hasBills && billsOnDay.every(b => isPaidThisMonth(b.payments))
          const hasOverdue = hasBills && !allPaid && day < now.getDate()

          return (
            <div key={day}
              className={cn(
                'min-h-[60px] rounded-lg border p-1 transition-colors',
                isToday ? 'border-ldg-green/30 bg-ldg-green/[0.06]' : 'border-ldg-ink/[0.07] bg-ldg-card',
                hasOverdue && 'border-ldg-urgent/30'
              )}>
              <div className={cn('text-xs font-bold mb-0.5 text-right',
                isToday ? 'text-ldg-green' : 'text-ldg-ink/55')}>
                {day}
              </div>
              <div className="space-y-0.5">
                {billsOnDay.map(b => {
                  const paid = isPaidThisMonth(b.payments)
                  return (
                    <button
                      key={b.id}
                      onClick={() => !paid && onMarkPaid(b)}
                      title={`${b.name} — ${b.amount.toLocaleString()} ${b.currency}${paid ? ' (paid)' : ''}`}
                      className={cn(
                        'w-full text-left text-[9px] leading-tight px-1 py-0.5 rounded truncate font-medium transition-opacity',
                        paid
                          ? 'bg-ldg-ink/[0.06] text-ldg-ink/40 line-through'
                          : hasOverdue
                            ? 'bg-ldg-urgent/[0.08] text-ldg-urgent hover:bg-ldg-urgent/[0.15]'
                            : 'bg-ldg-ink/[0.06] text-ldg-ink/70 hover:bg-ldg-ink/[0.1]'
                      )}>
                      {b.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-ldg-ink/55">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-ldg-ink/[0.06] inline-block" />Upcoming</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-ldg-urgent/[0.08] inline-block" />Overdue</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-ldg-ink/[0.06] inline-block" />Paid</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded border-2 border-ldg-green/30 inline-block" />Today</span>
        <span className="ml-auto text-ldg-ink/40">Click a bill to mark paid</span>
      </div>
    </div>
  )
}
