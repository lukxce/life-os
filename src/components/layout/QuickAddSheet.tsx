'use client'
import { useState } from 'react'
import { X, Dumbbell, Target } from 'lucide-react'
import { QuickAddModal } from '@/components/habits/QuickAddModal'
import { cn } from '@/lib/utils'

interface Props {
  onClose: () => void
  onCreated: () => void
}

type Mode = 'choice' | 'habit' | 'goal'

const GOAL_TYPES = [
  { key: 'short_term', label: 'Short-term', emoji: '⚡' },
  { key: 'long_term',  label: 'Long-term',  emoji: '🚀' },
  { key: 'bucket_list',label: 'Bucket list',emoji: '🌍' },
]

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f97316', '#10b981', '#3b82f6']
function GoalForm({ onClose, onCreated }: Props) {
  const [name, setName] = useState('')
  const [type, setType] = useState('short_term')
  const [color, setColor] = useState('#6366f1')
  const [emoji, setEmoji] = useState('🎯')
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!name.trim()) return
    setSaving(true)
    await fetch('/api/life/goals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name.trim(), type, color, emoji }) })
    setSaving(false)
    onCreated()
    onClose()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">New goal</h2>
        <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
      </div>

      <input autoFocus type="text" placeholder="What do you want to achieve?"
        className="w-full border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm bg-gray-50 dark:bg-gray-800 outline-none focus:border-indigo-400"
        value={name} onChange={e => setName(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') save() }} />

      <div className="flex gap-1.5">
        {GOAL_TYPES.map(t => (
          <button key={t.key} onClick={() => setType(t.key)} className={cn('flex-1 py-2 text-xs font-semibold rounded-xl border transition-colors', type === t.key ? 'bg-indigo-600 text-white border-indigo-600' : 'border-black/10 dark:border-white/10 text-gray-600 dark:text-gray-400')}>
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex gap-1.5 flex-wrap">
          {['🎯','🚀','💡','🏆','🌱','🌍'].map(e => (
            <button key={e} onClick={() => setEmoji(e)} className={cn('w-9 h-9 rounded-xl text-lg flex items-center justify-center', emoji === e ? 'ring-2 ring-indigo-500 bg-indigo-50' : 'bg-gray-100 dark:bg-gray-800')}>
              {e}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 flex-wrap ml-auto">
          {COLORS.map(c => (
            <button key={c} onClick={() => setColor(c)} className={cn('w-6 h-6 rounded-full', color === c && 'ring-2 ring-offset-1 ring-gray-400')} style={{ backgroundColor: c }} />
          ))}
        </div>
      </div>

      <button onClick={save} disabled={saving || !name.trim()} className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-2xl disabled:opacity-50">
        {saving ? 'Saving…' : 'Add goal'}
      </button>
    </div>
  )
}

export function QuickAddSheet({ onClose, onCreated }: Props) {
  const [mode, setMode] = useState<Mode>('choice')

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg bg-surface/90 dark:bg-surface/70 rounded-t-3xl md:rounded-2xl p-5 pb-8 md:pb-5 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {mode === 'choice' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">What do you want to add?</h2>
              <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setMode('habit')}
                className="flex flex-col items-center gap-2.5 p-4 rounded-2xl border-2 border-black/5 dark:border-white/5 hover:border-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all"
              >
                <span className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
                  <Dumbbell size={22} className="text-ldg-green" />
                </span>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Habit</span>
              </button>
              <button
                onClick={() => setMode('goal')}
                className="flex flex-col items-center gap-2.5 p-4 rounded-2xl border-2 border-black/5 dark:border-white/5 hover:border-violet-300 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all"
              >
                <span className="w-12 h-12 rounded-2xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
                  <Target size={22} className="text-violet-600 dark:text-violet-400" />
                </span>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Goal</span>
              </button>
            </div>
          </div>
        )}

        {mode === 'habit' && <QuickAddModal onClose={onClose} onCreated={() => { onCreated(); onClose() }} embedded />}
        {mode === 'goal' && <GoalForm onClose={onClose} onCreated={onCreated} />}
      </div>
    </div>
  )
}
