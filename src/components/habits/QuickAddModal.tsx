'use client'
import { useState } from 'react'
import { X, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  onClose: () => void
  onCreated: () => void
  embedded?: boolean
}

const defaultForm = {
  name: '', category: '', type: 'boolean', icon: '', color: '#6366f1',
  unit: '', target: '', timeOfDay: 'all_day', frequency: 'daily',
}

export function QuickAddModal({ onClose, onCreated, embedded }: Props) {
  const [form, setForm] = useState({ ...defaultForm })
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!form.name.trim()) return
    setSaving(true)
    await fetch('/api/life/habits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        category: form.category.trim() || 'General',
        target: form.target ? Number(form.target) : null,
        unit: form.unit || null,
        icon: form.icon || null,
        frequencyDays: [],
      }),
    })
    setSaving(false)
    onCreated()
    onClose()
  }

  const content = (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">New habit</h2>
        <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800">
          <X size={18} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-xs text-gray-500 mb-1">Name *</label>
          <input autoFocus className="w-full border border-black/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 outline-none focus:border-ldg-green"
            value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Morning run" />
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-gray-500 mb-1">Category</label>
          <input className="w-full border border-black/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 outline-none focus:border-ldg-green"
            value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="e.g. Health & Body (optional)" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Icon (emoji)</label>
          <input className="w-full border border-black/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 outline-none"
            value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })} placeholder="🏃" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Color</label>
          <input type="color" className="w-full h-10 border border-black/10 dark:border-white/10 rounded-xl px-1 bg-gray-50 dark:bg-gray-800 cursor-pointer"
            value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} />
        </div>
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">Type</label>
        <div className="flex gap-2">
          {[{ v: 'boolean', l: '✓ Yes/No' }, { v: 'quantity', l: '# Quantity' }].map(t => (
            <button key={t.v} onClick={() => setForm({ ...form, type: t.v })}
              className={cn('flex-1 py-2 text-sm rounded-xl border transition-colors', form.type === t.v ? 'bg-ldg-green text-white border-ldg-green' : 'border-black/10 dark:border-white/10')}>
              {t.l}
            </button>
          ))}
        </div>
      </div>

      {form.type === 'quantity' && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Unit</label>
            <input className="w-full border border-black/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 outline-none"
              value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} placeholder="ml, km, reps…" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Target</label>
            <input type="number" className="w-full border border-black/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 outline-none"
              value={form.target} onChange={e => setForm({ ...form, target: e.target.value })} placeholder="2000" />
          </div>
        </div>
      )}

      <div>
        <label className="block text-xs text-gray-500 mb-1">Time of day</label>
        <div className="flex gap-1.5 flex-wrap">
          {[{ v: 'morning', l: '🌅 Morning' }, { v: 'noon', l: '☀️ Noon' }, { v: 'night', l: '🌙 Night' }, { v: 'all_day', l: '🕐 All Day' }].map(t => (
            <button key={t.v} onClick={() => setForm({ ...form, timeOfDay: t.v })}
              className={cn('px-3 py-1.5 text-xs rounded-full border transition-colors', form.timeOfDay === t.v ? 'bg-ldg-green text-white border-ldg-green' : 'border-black/10 dark:border-white/10')}>
              {t.l}
            </button>
          ))}
        </div>
      </div>

      <button onClick={save} disabled={saving || !form.name.trim()}
        className="w-full py-3 bg-ldg-green text-white font-semibold rounded-2xl hover:opacity-90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
        <Check size={18} />
        {saving ? 'Saving…' : 'Add habit'}
      </button>
    </div>
  )

  if (embedded) return content

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg bg-surface/90 dark:bg-surface/70 rounded-t-3xl md:rounded-2xl p-5 pb-8 md:pb-5 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {content}
      </div>
    </div>
  )
}
