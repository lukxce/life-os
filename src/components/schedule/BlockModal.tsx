'use client'
import { useState } from 'react'
import { X } from 'lucide-react'

export type BlockFormData = {
  startTime: string
  endTime: string
  name: string
  note: string
  category: string
  sacred: boolean
}

type Props = {
  initial?: Partial<BlockFormData> & { id?: string }
  onSave: (data: BlockFormData) => void
  onDelete?: () => void
  onCancel: () => void
}

const CATEGORIES = [
  { value: 'ritual', label: 'Ritual' },
  { value: 'hypefy', label: 'Hypefy' },
  { value: 'agency', label: 'Agency' },
  { value: 'pt', label: 'PT' },
  { value: 'food', label: 'Food' },
  { value: 'social', label: 'Social' },
  { value: 'property', label: 'Property' },
  { value: 'sleep', label: 'Sleep' },
]

export function BlockModal({ initial, onSave, onDelete, onCancel }: Props) {
  const [form, setForm] = useState<BlockFormData>({
    startTime: initial?.startTime ?? '',
    endTime: initial?.endTime ?? '',
    name: initial?.name ?? '',
    note: initial?.note ?? '',
    category: initial?.category ?? 'ritual',
    sacred: initial?.sacred ?? false,
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSave(form)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 text-base">
            {initial?.id ? 'Edit block' : 'Add block'}
          </h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Start time</label>
              <input
                type="text"
                placeholder="09:00"
                value={form.startTime}
                onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">End time <span className="text-gray-400">(optional)</span></label>
              <input
                type="text"
                placeholder="10:00"
                value={form.endTime}
                onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
            <input
              type="text"
              placeholder="Block name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Note <span className="text-gray-400">(optional)</span></label>
            <textarea
              placeholder="Add a note..."
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="sacred-check"
              type="checkbox"
              checked={form.sacred}
              onChange={(e) => setForm((f) => ({ ...f, sacred: e.target.checked }))}
              className="w-4 h-4 accent-indigo-600"
            />
            <label htmlFor="sacred-check" className="text-sm text-gray-700 font-medium">Sacred (non-negotiable)</label>
          </div>

          <div className="flex items-center gap-2 pt-1">
            {onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-500 hover:bg-red-600 transition-colors mr-auto"
              >
                Delete
              </button>
            )}
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
