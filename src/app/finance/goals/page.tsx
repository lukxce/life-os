'use client'
import { useEffect, useState } from 'react'
import { Plus, Trash2, Pencil, PiggyBank, X } from 'lucide-react'
import { toast } from 'sonner'
import { NumberInput } from '@/components/ui/NumberInput'
import { HeroStat } from '@/components/ui/synth'
import { cn } from '@/lib/utils'

const defaultForm = { name: '', targetAmount: '', currency: 'EUR', accountId: '', targetDate: '', notes: '' }

function inputCls() {
  return 'mt-1 w-full border border-black/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-[rgb(var(--l-green))]'
}

function GoalCard({ goal, onEdit, onDelete, onDeposit }: { goal: any; onEdit: () => void; onDelete: () => void; onDeposit: () => void }) {
  const pct = goal.pct ?? 0
  const barColor = pct >= 100 ? 'bg-emerald-500' : pct >= 75 ? 'bg-[rgb(var(--l-green))]' : 'bg-[rgb(var(--l-green))]'

  const daysLeft = goal.targetDate
    ? Math.ceil((new Date(goal.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <div className="bg-surface/90 rounded-2xl border border-black/5 dark:border-white/5 shadow-sm p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-[rgb(var(--l-green))]/10 flex items-center justify-center shrink-0">
            <PiggyBank size={18} className="text-[rgb(var(--l-green))]" />
          </div>
          <div>
            <p className="font-semibold text-ink">{goal.name}</p>
            {goal.targetDate && (
              <p className={cn('text-xs mt-0.5', daysLeft !== null && daysLeft < 30 ? 'text-[rgb(var(--l-green))] font-medium' : 'text-ink/40')}>
                {daysLeft !== null && daysLeft > 0 ? `${daysLeft} days to go` : daysLeft === 0 ? 'Today\'s the day' : 'Past your target date'}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onEdit} className="text-ink/30 hover:text-ink p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"><Pencil size={14} /></button>
          <button onClick={onDelete} className="text-ink/30 hover:text-[rgb(var(--coral))] p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"><Trash2 size={14} /></button>
        </div>
      </div>

      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-ink/50">
            {goal.currency === 'EUR' ? '€' : ''}{goal.saved.toLocaleString('en', { maximumFractionDigits: 2 })} {goal.currency} saved so far
          </span>
          <span className="font-semibold text-ink/70">
            of {goal.currency === 'EUR' ? '€' : ''}{goal.targetAmount.toLocaleString()} {goal.currency}
          </span>
        </div>
        <div className="h-3 bg-canvas-alt rounded-full overflow-hidden">
          <div className={cn('h-full rounded-full transition-all duration-700', barColor)} style={{ width: `${Math.min(100, pct)}%` }} />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-xs text-ink/40">{pct.toFixed(1)}% there</span>
          {pct < 100 && (
            <span className="text-xs text-ink/40">
              {goal.currency === 'EUR' ? '€' : ''}{Math.max(0, goal.targetAmount - goal.saved).toLocaleString('en', { maximumFractionDigits: 2 })} {goal.currency} left
            </span>
          )}
        </div>
      </div>

      {goal.accountId && (
        <p className="text-xs text-[rgb(var(--l-green))] mb-3">Tracking automatically from a linked account</p>
      )}

      {goal.notes && <p className="text-xs text-ink/40 mb-3">{goal.notes}</p>}

      <button onClick={onDeposit}
        className="w-full border border-[rgb(var(--l-green))]/30 text-[rgb(var(--l-green))] py-2.5 rounded-xl text-sm font-semibold hover:bg-[rgb(var(--l-green))]/10 transition-colors">
        + Add money towards this
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
      fetch('/api/finance/accounts?simple=1').then(r => r.json()),
    ])
    setGoals(Array.isArray(g) ? g : [])
    setAccounts(Array.isArray(a) ? a : [])
  }

  useEffect(() => { load() }, [])

  const submit = async () => {
    if (!form.name.trim() || !form.targetAmount) { toast.error('Give it a name and a target first'); return }
    const payload = { ...form, targetAmount: +form.targetAmount, accountId: form.accountId || null, targetDate: form.targetDate || null }
    if (editingId) {
      await fetch('/api/finance/goals', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editingId, ...payload }) })
      toast.success('Updated')
    } else {
      await fetch('/api/finance/goals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      toast.success("New goal — let's get there")
    }
    setShowForm(false); setEditingId(null); setForm(defaultForm); load()
  }

  const del = async (id: string) => {
    if (!confirm('Remove this goal?')) return
    await fetch('/api/finance/goals', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    toast.success('Removed'); load()
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
    toast.success('Nice — logged')
    setDepositGoal(null)
    setDepositForm({ amount: '', currency: 'EUR', date: new Date().toISOString().split('T')[0], notes: '' })
    load()
  }

  const goalsInEUR = goals.filter(g => g.currency === 'EUR')
  const totalSavedEUR = goalsInEUR.reduce((s, g) => s + g.saved, 0)
  const totalTargetEUR = goalsInEUR.reduce((s, g) => s + g.targetAmount, 0)
  const closestGoal = [...goals].filter(g => (g.pct ?? 0) < 100).sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0))[0]

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-ink tracking-tight">What you're saving for</h1>
        <p className="text-sm text-ink/50 mt-0.5">Set a target, log deposits as they happen, watch it climb.</p>
      </div>

      {/* Hero: the overall picture */}
      {goals.length > 0 && (
        <div className="bg-surface/90 rounded-3xl border border-black/5 dark:border-white/5 shadow-sm p-5">
          <div className="grid grid-cols-2 gap-4">
            {totalTargetEUR > 0 && (
              <HeroStat label="Saved across goals" value={`€${totalSavedEUR.toLocaleString('en', { maximumFractionDigits: 0 })}`}
                sub={`of €${totalTargetEUR.toLocaleString()} target`} />
            )}
            {closestGoal && (
              <HeroStat label="Closest to done" value={closestGoal.name} sub={`${(closestGoal.pct ?? 0).toFixed(0)}% there`} />
            )}
          </div>
        </div>
      )}

      <button onClick={() => { setEditingId(null); setForm(defaultForm); setShowForm(s => !s) }}
        className="flex items-center justify-center gap-2 w-full bg-[rgb(var(--l-green))] text-white px-4 py-3 rounded-2xl text-sm font-semibold hover:bg-[rgb(var(--l-green))] active:scale-[0.98] transition-all">
        {showForm ? <X size={16} /> : <Plus size={16} />} {showForm ? 'Never mind' : 'Start a new goal'}
      </button>

      {showForm && (
        <div className="bg-surface/90 rounded-3xl border border-black/5 dark:border-white/5 shadow-sm p-5">
          <h3 className="font-semibold text-ink mb-4">{editingId ? 'Update this goal' : "What are you working towards?"}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-ink/50">Name it</label>
              <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="Vacation, new laptop, emergency fund…" className={inputCls()} />
            </div>
            <div>
              <label className="text-xs font-medium text-ink/50">Target amount</label>
              <NumberInput value={form.targetAmount} onChange={v => setForm(p => ({ ...p, targetAmount: v }))} className={inputCls()} />
            </div>
            <div>
              <label className="text-xs font-medium text-ink/50">Currency</label>
              <select value={form.currency} onChange={e => setForm(p => ({ ...p, currency: e.target.value }))} className={inputCls()}>
                <option>EUR</option><option>RSD</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-ink/50">Link a savings account (optional)</label>
              <select value={form.accountId} onChange={e => setForm(p => ({ ...p, accountId: e.target.value }))} className={inputCls()}>
                <option value="">No — I'll log deposits myself</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-ink/50">Target date (optional)</label>
              <input type="date" value={form.targetDate} onChange={e => setForm(p => ({ ...p, targetDate: e.target.value }))} className={inputCls()} />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-ink/50">Notes</label>
              <input type="text" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                placeholder="Anything worth remembering about this one?" className={inputCls()} />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={submit} className="flex-1 bg-[rgb(var(--l-green))] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[rgb(var(--l-green))]">
              {editingId ? 'Save changes' : 'Start saving'}
            </button>
            <button onClick={() => { setShowForm(false); setEditingId(null); setForm(defaultForm) }}
              className="px-5 py-2.5 rounded-xl text-sm text-ink/60 border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5">
              Cancel
            </button>
          </div>
        </div>
      )}

      {depositGoal && (
        <div className="bg-surface/90 rounded-3xl border border-black/5 dark:border-white/5 shadow-sm p-5">
          <h3 className="font-semibold text-ink mb-3">Adding to "{depositGoal.name}"</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-ink/50">Amount</label>
              <NumberInput value={depositForm.amount} onChange={v => setDepositForm(p => ({ ...p, amount: v }))} className={inputCls()} />
            </div>
            <div>
              <label className="text-xs font-medium text-ink/50">Currency</label>
              <select value={depositForm.currency} onChange={e => setDepositForm(p => ({ ...p, currency: e.target.value }))} className={inputCls()}>
                <option>EUR</option><option>RSD</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-ink/50">Date</label>
              <input type="date" value={depositForm.date} onChange={e => setDepositForm(p => ({ ...p, date: e.target.value }))} className={inputCls()} />
            </div>
            <div>
              <label className="text-xs font-medium text-ink/50">Notes</label>
              <input type="text" value={depositForm.notes} onChange={e => setDepositForm(p => ({ ...p, notes: e.target.value }))} className={inputCls()} />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={logDeposit} className="flex-1 bg-[rgb(var(--l-green))] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[rgb(var(--l-green))]">Add it</button>
            <button onClick={() => setDepositGoal(null)}
              className="px-5 py-2.5 rounded-xl text-sm text-ink/60 border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5">Cancel</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {goals.length === 0 ? (
          <div className="bg-surface/90 rounded-3xl border border-black/5 dark:border-white/5 shadow-sm p-10 text-center">
            <p className="text-ink/60 font-medium">Nothing you're saving towards yet.</p>
            <p className="text-sm text-ink/40 mt-1">Start one above — even a rough target beats none.</p>
          </div>
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
