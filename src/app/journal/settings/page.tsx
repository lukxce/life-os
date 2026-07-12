'use client'
import { useEffect, useState, useCallback } from 'react'
import { Plus, Trash2, GripVertical, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface Question { id: string; text: string; order: number }

export default function JournalSettingsPage() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [newQ, setNewQ] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const res = await fetch('/api/life/journal/questions')
    setQuestions(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function add() {
    if (!newQ.trim()) return
    setSaving(true)
    await fetch('/api/life/journal/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: newQ.trim() }),
    })
    setNewQ('')
    setSaving(false)
    load()
  }

  async function del(id: string) {
    await fetch(`/api/life/journal/questions/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-6 pb-24 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/journal" className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Reflection Questions</h1>
          <p className="text-sm text-gray-400">These appear every week for you to answer</p>
        </div>
      </div>

      {/* Add new question */}
      <div className="bg-surface/90 dark:bg-surface/70 rounded-2xl border border-black/5 dark:border-white/5 p-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Add Question</p>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="e.g. What am I grateful for this week?"
            className="flex-1 text-sm bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-2.5 outline-none border border-black/10 dark:border-white/10 focus:ring-2 focus:ring-amber-300 dark:focus:ring-amber-700"
            value={newQ}
            onChange={e => setNewQ(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') add() }}
            autoFocus
          />
          <button
            onClick={add}
            disabled={!newQ.trim() || saving}
            className="px-4 py-2.5 bg-ldg-green hover:opacity-90 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 shrink-0"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      {/* Question list */}
      <div className="bg-surface/90 dark:bg-surface/70 rounded-2xl border border-black/5 dark:border-white/5 overflow-hidden">
        <div className="px-4 py-3 border-b border-black/5 dark:border-white/5">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
            Current Questions <span className="text-gray-300 dark:text-gray-600 ml-1">{questions.length}</span>
          </p>
        </div>

        {loading ? (
          <div className="p-4 space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="h-10 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}
          </div>
        ) : questions.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            No questions yet — add one above to get started
          </div>
        ) : (
          <div className="divide-y divide-black/5 dark:divide-white/5">
            {questions.map(q => (
              <div key={q.id} className="flex items-center gap-3 px-4 py-3 group hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <GripVertical size={14} className="text-gray-300 dark:text-gray-600 shrink-0" />
                <p className="flex-1 text-sm text-gray-700 dark:text-gray-300 leading-snug">{q.text}</p>
                <button
                  onClick={() => del(q.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-300 hover:text-red-400 transition-all shrink-0 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                  title="Remove question"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
