'use client'
import { useEffect, useState } from 'react'
import { Plus, Trash2, Pencil, PiggyBank } from 'lucide-react'
import { toast } from 'sonner'
import { NumberInput } from '@/components/ui/NumberInput'

const defaultForm = { name: '', targetAmount: '', currency: 'EUR', accountId: '', targetDate: '', notes: '' }

function GoalCard({ goal, onEdit, onDelete, onDeposit }: { goal: any; onEdit: () => void; onDelete: () => void; onDeposit: () => void }) {
  const pct = goal.pct ?? 0
  const barColor = pct >= 100 ? 'bg-green-500' : pct >= 75 ? 'bg-blue-500' : pct >= 40 ? 'bg-blue-400' : 'bg-blue-300'

  const daysLeft = goal.targetDate
    ? Math.ceil((new Date(goal.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center shrink-0">
            <PiggyBank size={18} className="text-blue-500" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 dark:text-gray-100">{goal.name}</p>
            {goal.targetDate && (
              <p className={`text-xs mt-0.5 ${daysLeft !== null && daysLeft < 30 ? 'text-orange-500' : 'text-gray-400 dark:text-gray-500'}`}>
                {daysLeft !== null && daysLeft > 0 ? `${daysLeft} days left` : daysLeft === 0 ? 'Due today' : 'Past target date'}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onEdit} className="text-gray-400 hover:text-blue-500 p-1"><Pencil size={14} /></button>
          <button onClick={onDelete} className="text-gray-400 hover:text-red-500 p-1"><Trash2 size={14} /></button>
        </div>
      </div>

      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-gray-500 dark:text-gray-400">
            {goal.currency === 'EUR' ? '€' : ''}{goal.saved.toLocaleString('en', { maximumFractionDigits: 2 })} {goal.currency} saved
          </span>
          <span className="font-semibold text-gray-700 dark:text-gray-300">
            {goal.currency === 'EUR' ? '€' : ''}{goal.targetAmount.toLocaleString()} {goal.currency}
          </span>
        </div>
        <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${Math.min(100, pct)}%` }} />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-xs text-gray-400">{pct.toFixed(1)}% complete</span>
          {pct < 100 && (
            <span className="text-xs text-gray-400">
              {goal.currency === 'EUR' ? '€' : ''}{Math.max(0, goal.targetAmount - goal.saved).toLocaleString('en', { maximumFractionDigits: 2 })} {goal.currency} to go
            </span>
          )}
        </div>
      </div>

      {goal.accountId && (
        <p className="text-xs text-blue-500 dark:text-blue-400 mb-3">Auto-tracking from linked account</p>
      )}

      {goal.notes && <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">{goal.notes}</p>}

      <button onClick={onDeposit}
        className="w-full border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 py-2 rounded-lg text-sm font-medium hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors">
        + Log deposit
      </button>
    </div>
  )
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<any[]>([])
  const [accounts, setAccounts] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(defaultForm)
  const [depositGoal, setDepositGoal] = useState<any | null>(null)
  const [depositForm, setDepositForm] = useState({ amount: '', currency: 'EUR', date: new Date().toISOString().split('T')[0], notes: '' })

  const load = async () => {
    const [g, a] = await Promise.all([
      fetch('/api/finance/goals').then(r => r.json()),
      fetch('/api/finance/accounts').then(r => r.json()),
    ])
    setGoals(Array.isArray(g) ? g : [])
    setAccounts(Array.isArray(a) ? a : [])
  }

  useEffect(() => { load() }, [])

  const submit = async () => {
    const payload = { ...form, targetAmount: +form.targetAmount, accountId: form.accountId || null, targetDate: form.targetDate || null }
    if (editingId) {
      await fetch('/api/finance/goals', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editingId, ...payload }) })
      toast.success('Goal updated')
    } else {
      await fetch('/api/finance/goals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      toast.success('Goal added')
    }
    setShowForm(false); setEditingId(null); setForm(defaultForm); load()
  }

  const del = async (id: string) => {
    if (!confirm('Delete goal?')) return
    await fetch('/api/finance/goals', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    toast.success('Deleted'); load()
  }

  const startEdit = (g: any) => {
    setEditingId(g.id)
    setForm({ name: g.name, targetAmount: String(g.targetAmount), currency: g.currency, accountId: g.accountId || '', targetDate: g.targetDate ? new Date(g.targetDate).toISOString().split('T')[0] : '', notes: g.notes || '' })
    setShowForm(true)
  }

  const logDeposit = async () => {
    if (!depositGoal || !depositForm.amount) return
    await fetch('/api/finance/goals/deposit', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goalId: depositGoal.id, ...depositForm })
    })
    toast.success('Deposit logged')
    setDepositGoal(null)
    setDepositForm({ amount: '', currency: 'EUR', date: new Date().toISOString().split('T')[0], notes: '' })
    load()
  }

  const savingsAccounts = accounts.filter(a => a.name.toLowerCase().includes('sav') || a.type === 'personal')

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Saving Goals</h2>
        <button onClick={() => { setEditingId(null); setForm(defaultForm); setShowForm(s => !s) }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus size={16} /> Add Goal
        </button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">{editingId ? 'Edit Goal' : 'New Goal'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Goal name</label>
              <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Vacation, New laptop, Emergency fund"
                className="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Target amount</label>
              <NumberInput value={form.targetAmount} onChange={v => setForm(p => ({ ...p, targetAmount: v }))}
                className="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Currency</label>
              <select value={form.currency} onChange={e => setForm(p => ({ ...p, currency: e.target.value }))}
                className="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>EUR</option><option>RSD</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Link to savings account (optional)</label>
              <select value={form.accountId} onChange={e => setForm(p => ({ ...p, accountId: e.target.value }))}
                className="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">None — manual deposits only</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Target date (optional)</label>
              <input type="date" value={form.targetDate} onChange={e => setForm(p => ({ ...p, targetDate: e.target.value }))}
                className="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Notes</label>
              <input type="text" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                placeholder="What are you saving for?"
                className="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={submit} className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">{editingId ? 'Update' : 'Save'}</button>
            <button onClick={() => { setShowForm(false); setEditingId(null); setForm(defaultForm) }} className="border border-gray-300 dark:border-gray-600 px-5 py-2 rounded-lg text-sm">Cancel</button>
          </div>
        </div>
      )}

      {depositGoal && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Log deposit — {depositGoal.name}</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Amount</label>
              <NumberInput value={depositForm.amount} onChange={v => setDepositForm(p => ({ ...p, amount: v }))}
                className="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Currency</label>
              <select value={depositForm.currency} onChange={e => setDepositForm(p => ({ ...p, currency: e.target.value }))}
                className="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>EUR</option><option>RSD</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Date</label>
              <input type="date" value={depositForm.date} onChange={e => setDepositForm(p => ({ ...p, date: e.target.value }))}
                className="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Notes</label>
              <input type="text" value={depositForm.notes} onChange={e => setDepositForm(p => ({ ...p, notes: e.target.value }))}
                className="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={logDeposit} className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">Log</button>
            <button onClick={() => setDepositGoal(null)} className="border border-gray-300 dark:border-gray-600 px-5 py-2 rounded-lg text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {goals.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center text-gray-400 dark:text-gray-500">No goals yet</div>
        ) : goals.map(g => (
          <GoalCard key={g.id} goal={g}
            onEdit={() => startEdit(g)}
            onDelete={() => del(g.id)}
            onDeposit={() => { setDepositGoal(g); setDepositForm(p => ({ ...p, currency: g.currency })) }}
          />
        ))}
      </div>
    </div>
  )
}
