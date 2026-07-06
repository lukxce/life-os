'use client'
import { useEffect, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Check, Plus, Trash2, ChevronDown, Target, X, Search } from 'lucide-react'

interface Milestone { id: string; name: string; completed: boolean; order: number }
interface Goal {
  id: string; name: string; emoji?: string | null; color?: string | null
  targetDate?: string | null; completed: boolean; type: string; order: number
  milestones: Milestone[]
}

type GoalType = 'short_term' | 'long_term' | 'bucket_list'

const TABS: { key: GoalType; label: string; emoji: string }[] = [
  { key: 'short_term',  label: 'Short-term', emoji: '⚡' },
  { key: 'long_term',   label: 'Long-term',  emoji: '🚀' },
  { key: 'bucket_list', label: 'Bucket list', emoji: '🌍' },
]

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f97316', '#10b981', '#3b82f6', '#14b8a6', '#f59e0b']
const DEFAULT_EMOJIS = ['🎯', '🚀', '💡', '🏆', '📈', '🌟', '💪', '🧠', '🌱', '🎨', '🌍', '✈️', '🏄', '🎸', '📚']

function GoalCard({ goal, isBucket, onUpdate, onDelete, onAddMilestone, onToggleMilestone, onDeleteMilestone }: {
  goal: Goal; isBucket: boolean
  onUpdate: (patch: Partial<Goal>) => void
  onDelete: () => void
  onAddMilestone: (name: string) => void
  onToggleMilestone: (mid: string, completed: boolean) => void
  onDeleteMilestone: (mid: string) => void
}) {
  const [expanded, setExpanded] = useState(!isBucket)
  const [newMilestone, setNewMilestone] = useState('')
  const [addingMilestone, setAddingMilestone] = useState(false)
  const color = goal.color ?? '#6366f1'
  const done = goal.milestones.filter(m => m.completed).length
  const total = goal.milestones.length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  const daysLeft = goal.targetDate
    ? Math.ceil((new Date(goal.targetDate).getTime() - Date.now()) / 86400000)
    : null

  return (
    <div className="bg-surface/90 dark:bg-surface/70 rounded-2xl border border-black/5 dark:border-white/5 overflow-hidden">
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start gap-3">
          <span className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0" style={{ backgroundColor: color + '22' }}>
            {goal.emoji ?? '🎯'}
          </span>
          <div className="flex-1 min-w-0">
            <p className={cn('text-base font-semibold truncate', goal.completed && 'line-through text-gray-400')}>
              {goal.name}
            </p>
            {daysLeft != null && (
              <p className={cn('text-xs mt-0.5', daysLeft < 0 ? 'text-red-400' : daysLeft < 14 ? 'text-amber-500' : 'text-gray-400')}>
                {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : daysLeft === 0 ? 'Due today' : `${daysLeft}d left`}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => onUpdate({ completed: !goal.completed })}
              className="w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all"
              style={goal.completed ? { backgroundColor: color, borderColor: color } : { borderColor: '#d1d5db' }}
            >
              {goal.completed && <Check size={12} strokeWidth={3} className="text-white" />}
            </button>
            <button onClick={onDelete} className="p-1 rounded-lg text-gray-300 hover:text-red-400 transition-colors">
              <Trash2 size={14} />
            </button>
            {!isBucket && (
              <button onClick={() => setExpanded(!expanded)} className="p-1 rounded-lg text-gray-300 hover:text-gray-500 transition-colors">
                <ChevronDown size={14} className={cn('transition-transform', expanded && 'rotate-180')} />
              </button>
            )}
          </div>
        </div>

        {!isBucket && total > 0 && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>{done}/{total} milestones</span>
              <span style={{ color }}>{pct}%</span>
            </div>
            <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
            </div>
          </div>
        )}
      </div>

      {!isBucket && expanded && (
        <div className="border-t border-black/5 dark:border-white/5">
          {goal.milestones.map(m => (
            <div key={m.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-black/5 dark:border-white/5/50 last:border-0 group">
              <button
                onClick={() => onToggleMilestone(m.id, !m.completed)}
                className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all"
                style={m.completed ? { backgroundColor: color, borderColor: color } : { borderColor: '#d1d5db' }}
              >
                {m.completed && <Check size={10} strokeWidth={3} className="text-white" />}
              </button>
              <span className={cn('text-sm flex-1', m.completed && 'line-through text-gray-400')}>{m.name}</span>
              <button onClick={() => onDeleteMilestone(m.id)} className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-400 transition-all">
                <X size={12} />
              </button>
            </div>
          ))}
          <div className="px-4 py-2.5">
            {addingMilestone ? (
              <input
                autoFocus type="text" placeholder="Milestone name…"
                className="w-full text-sm bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2 outline-none border border-black/10 dark:border-white/10"
                value={newMilestone}
                onChange={e => setNewMilestone(e.target.value)}
                onBlur={() => { if (newMilestone.trim()) { onAddMilestone(newMilestone.trim()); setNewMilestone('') } setAddingMilestone(false) }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && newMilestone.trim()) { onAddMilestone(newMilestone.trim()); setNewMilestone('') }
                  if (e.key === 'Escape') setAddingMilestone(false)
                }}
              />
            ) : (
              <button onClick={() => setAddingMilestone(true)} className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                <Plus size={14} /> Add milestone
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function AddGoalModal({ onClose, onAdd, defaultType }: { onClose: () => void; onAdd: (g: Partial<Goal>) => void; defaultType: GoalType }) {
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('🎯')
  const [color, setColor] = useState('#6366f1')
  const [targetDate, setTargetDate] = useState('')
  const [type, setType] = useState<GoalType>(defaultType)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-surface/90 dark:bg-surface/70 rounded-2xl w-full max-w-sm p-5 space-y-4">
        <h2 className="text-lg font-bold">New goal</h2>

        <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setType(t.key)} className={cn('flex-1 text-xs font-semibold py-1.5 rounded-lg transition-colors', type === t.key ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-500')}>
              {t.emoji} {t.label}
            </button>
          ))}
        </div>

        <input autoFocus type="text" placeholder="What do you want to achieve?"
          className="w-full text-sm bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3 outline-none border border-black/10 dark:border-white/10"
          value={name} onChange={e => setName(e.target.value)} />

        <div>
          <label className="text-xs text-gray-400 font-medium mb-1.5 block">Emoji</label>
          <div className="flex flex-wrap gap-1.5">
            {DEFAULT_EMOJIS.map(e => (
              <button key={e} onClick={() => setEmoji(e)} className={cn('w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all', emoji === e ? 'ring-2 ring-indigo-500 bg-indigo-50' : 'bg-gray-100 dark:bg-gray-800')}>
                {e}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-400 font-medium mb-1.5 block">Color</label>
          <div className="flex gap-2">
            {COLORS.map(c => (
              <button key={c} onClick={() => setColor(c)} className={cn('w-7 h-7 rounded-full transition-all', color === c && 'ring-2 ring-offset-2 ring-gray-400')} style={{ backgroundColor: c }} />
            ))}
          </div>
        </div>

        {type !== 'bucket_list' && (
          <div>
            <label className="text-xs text-gray-400 font-medium mb-1.5 block">Target date (optional)</label>
            <input type="date" className="w-full text-sm bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3 outline-none border border-black/10 dark:border-white/10"
              value={targetDate} onChange={e => setTargetDate(e.target.value)} />
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm font-medium text-gray-600 dark:text-gray-400">Cancel</button>
          <button
            onClick={() => { if (name.trim()) { onAdd({ name: name.trim(), emoji, color, targetDate: targetDate || null, type }); onClose() } }}
            className="flex-1 py-3 rounded-xl bg-[rgb(167,120,160)] text-sm font-semibold text-white"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  )
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [activeTab, setActiveTab] = useState<GoalType>('short_term')
  const [searchText, setSearchText] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/life/goals')
    setGoals(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function addGoal(data: Partial<Goal>) {
    await fetch('/api/life/goals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    load()
  }
  async function updateGoal(id: string, patch: Partial<Goal>) {
    await fetch(`/api/life/goals/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) })
    load()
  }
  async function deleteGoal(id: string) {
    await fetch(`/api/life/goals/${id}`, { method: 'DELETE' })
    setGoals(prev => prev.filter(g => g.id !== id))
  }
  async function addMilestone(goalId: string, name: string) {
    await fetch(`/api/life/goals/${goalId}/milestones`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) })
    load()
  }
  async function toggleMilestone(goalId: string, mid: string, completed: boolean) {
    await fetch(`/api/life/goals/${goalId}/milestones/${mid}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ completed }) })
    load()
  }
  async function deleteMilestone(goalId: string, mid: string) {
    await fetch(`/api/life/goals/${goalId}/milestones/${mid}`, { method: 'DELETE' })
    load()
  }

  const q = searchText.toLowerCase()
  const tabGoals = goals.filter(g => g.type === activeTab && (!q || g.name.toLowerCase().includes(q)))
  const active = tabGoals.filter(g => !g.completed)
  const completed = tabGoals.filter(g => g.completed)
  const isBucket = activeTab === 'bucket_list'

  if (loading) return (
    <div className="space-y-4">
      {[1,2,3].map(i => <div key={i} className="h-28 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse" />)}
    </div>
  )

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Goals</h1>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-4 py-2 bg-[rgb(167,120,160)] text-white rounded-xl text-sm font-semibold">
          <Plus size={16} /> New
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
        {TABS.map(t => {
          const count = goals.filter(g => g.type === t.key && !g.completed).length
          return (
            <button key={t.key} onClick={() => setActiveTab(t.key)} className={cn('flex-1 text-xs font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-1', activeTab === t.key ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-gray-100' : 'text-gray-500')}>
              <span>{t.emoji}</span>
              <span>{t.label}</span>
              {count > 0 && <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900 text-[rgb(167,120,160)] dark:text-[rgb(167,120,160)] rounded-full px-1.5">{count}</span>}
            </button>
          )
        })}
      </div>

      {goals.length > 5 && (
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search goals…"
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            className="w-full bg-gray-50 dark:bg-gray-800 border border-black/10 dark:border-white/10 rounded-xl pl-8 pr-3 py-2 text-sm outline-none focus:border-indigo-500"
          />
          {searchText && (
            <button onClick={() => setSearchText('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={13} />
            </button>
          )}
        </div>
      )}

      {tabGoals.length === 0 && (
        <div className="bg-surface/90 dark:bg-surface/70 rounded-2xl border border-black/5 dark:border-white/5 p-10 text-center">
          <Target size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-sm font-medium text-gray-500">No {TABS.find(t => t.key === activeTab)?.label.toLowerCase()} yet</p>
          <button onClick={() => setShowAdd(true)} className="mt-4 px-5 py-2.5 bg-[rgb(167,120,160)] text-white rounded-xl text-sm font-semibold">Add one</button>
        </div>
      )}

      {active.length > 0 && (
        <div className="space-y-3">
          {active.map(g => (
            <GoalCard key={g.id} goal={g} isBucket={isBucket}
              onUpdate={p => updateGoal(g.id, p)} onDelete={() => deleteGoal(g.id)}
              onAddMilestone={n => addMilestone(g.id, n)}
              onToggleMilestone={(m, c) => toggleMilestone(g.id, m, c)}
              onDeleteMilestone={m => deleteMilestone(g.id, m)} />
          ))}
        </div>
      )}

      {completed.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Completed</h2>
          <div className="space-y-3 opacity-60">
            {completed.map(g => (
              <GoalCard key={g.id} goal={g} isBucket={isBucket}
                onUpdate={p => updateGoal(g.id, p)} onDelete={() => deleteGoal(g.id)}
                onAddMilestone={n => addMilestone(g.id, n)}
                onToggleMilestone={(m, c) => toggleMilestone(g.id, m, c)}
                onDeleteMilestone={m => deleteMilestone(g.id, m)} />
            ))}
          </div>
        </section>
      )}

      {showAdd && <AddGoalModal onClose={() => setShowAdd(false)} onAdd={addGoal} defaultType={activeTab} />}
    </div>
  )
}
