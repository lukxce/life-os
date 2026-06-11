'use client'
import { useEffect, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Plus, Trash2, ChevronDown, BookOpen, Settings2, X, GripVertical } from 'lucide-react'

interface Question { id: string; text: string; order: number }
interface Entry { id: string; date: string; answers: Record<string, string> }

function toLocalISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function mondayOf(d: Date): Date {
  const copy = new Date(d); copy.setHours(0,0,0,0)
  const day = copy.getDay()
  copy.setDate(copy.getDate() - (day === 0 ? 6 : day - 1))
  return copy
}
function weekLabel(monday: Date): string {
  const sunday = new Date(monday); sunday.setDate(sunday.getDate() + 6)
  const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  return `${fmt(monday)} – ${fmt(sunday)}`
}

// ── Settings Modal ─────────────────────────────────────────────────────────────
function QuestionsModal({ questions, onClose, onRefresh }: {
  questions: Question[]
  onClose: () => void
  onRefresh: () => void
}) {
  const [newQ, setNewQ] = useState('')
  const [saving, setSaving] = useState(false)

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
    onRefresh()
  }

  async function del(id: string) {
    await fetch(`/api/life/journal/questions/${id}`, { method: 'DELETE' })
    onRefresh()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-base">Reflection questions</h2>
            <p className="text-xs text-gray-400 mt-0.5">These appear every week for you to answer</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Question list */}
        <div className="px-5 py-4 space-y-2 max-h-72 overflow-y-auto">
          {questions.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No questions yet — add one below</p>
          ) : (
            questions.map(q => (
              <div key={q.id} className="flex items-center gap-3 group bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2.5">
                <GripVertical size={14} className="text-gray-300 dark:text-gray-600 shrink-0" />
                <p className="flex-1 text-sm text-gray-700 dark:text-gray-300 leading-snug">{q.text}</p>
                <button
                  onClick={() => del(q.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-400 transition-all shrink-0"
                  title="Remove question"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Add new question */}
        <div className="px-5 pb-5 border-t border-gray-100 dark:border-gray-800 pt-4">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. What am I grateful for this week?"
              className="flex-1 text-sm bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-2.5 outline-none border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-700"
              value={newQ}
              onChange={e => setNewQ(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') add() }}
              autoFocus
            />
            <button
              onClick={add}
              disabled={!newQ.trim() || saving}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 shrink-0"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function JournalPage() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [entries, setEntries] = useState<Entry[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const monday = mondayOf(new Date())
  const dateStr = toLocalISODate(monday)

  const load = useCallback(async () => {
    setLoading(true)
    const [qRes, eRes] = await Promise.all([
      fetch('/api/life/journal/questions'),
      fetch('/api/life/journal'),
    ])
    const qs: Question[] = await qRes.json()
    const es: Entry[] = await eRes.json()
    setQuestions(qs)
    setEntries(es)
    const thisWeek = es.find(e => toLocalISODate(new Date(e.date)) === dateStr)
    setAnswers(thisWeek?.answers ?? {})
    setLoading(false)
  }, [dateStr])

  useEffect(() => { load() }, [load])

  async function saveAnswers() {
    await fetch('/api/life/journal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: dateStr, answers }),
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    load()
  }

  const pastEntries = entries.filter(e => toLocalISODate(new Date(e.date)) !== dateStr)

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-12 space-y-6">
      {loading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => <div key={i} className="h-28 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse" />)}
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Journal</h1>
              <p className="text-sm text-gray-400 mt-0.5">{weekLabel(monday)}</p>
            </div>
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors mt-0.5"
              title="Manage questions"
            >
              <Settings2 size={16} />
            </button>
          </div>

            {/* This week's reflection */}
            {questions.length === 0 ? (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-8 text-center">
                <BookOpen size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-sm font-medium text-gray-500">No reflection questions yet</p>
                <p className="text-xs mt-1 text-gray-400">Add questions via the settings icon above to get started.</p>
                <button
                  onClick={() => setShowSettings(true)}
                  className="mt-4 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors"
                >
                  Add questions
                </button>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 space-y-5">
                {questions.map(q => (
                  <div key={q.id}>
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block leading-snug">
                      {q.text}
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Write your thoughts…"
                      className="w-full text-sm bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3 outline-none border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-700 resize-none leading-relaxed transition-shadow"
                      value={answers[q.id] ?? ''}
                      onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                    />
                  </div>
                ))}
                <button
                  onClick={saveAnswers}
                  className={cn(
                    'w-full py-3 rounded-xl text-sm font-semibold transition-colors',
                    saved ? 'bg-green-500 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  )}
                >
                  {saved ? '✓ Saved' : 'Save reflection'}
                </button>
              </div>
            )}

            {/* Past entries */}
            {pastEntries.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Past reflections</h2>
                <div className="space-y-2">
                  {pastEntries.map(entry => {
                    const entryMonday = mondayOf(new Date(entry.date))
                    const label = weekLabel(entryMonday)
                    const isOpen = expandedEntry === entry.id
                    const answerCount = Object.values(entry.answers).filter(Boolean).length
                    return (
                      <div key={entry.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                        <button
                          className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                          onClick={() => setExpandedEntry(isOpen ? null : entry.id)}
                        >
                          <BookOpen size={16} className="text-gray-400 shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{label}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{answerCount} of {questions.length} answered</p>
                          </div>
                          <ChevronDown size={14} className={cn('text-gray-400 transition-transform', isOpen && 'rotate-180')} />
                        </button>
                        {isOpen && (
                          <div className="border-t border-gray-100 dark:border-gray-800 px-4 py-4 space-y-4">
                            {questions.map(q => (
                              <div key={q.id}>
                                <p className="text-xs font-semibold text-gray-400 mb-1">{q.text}</p>
                                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                                  {entry.answers[q.id] || <span className="text-gray-300 dark:text-gray-600 italic">Not answered</span>}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </section>
            )}
          </>
        )}

      {/* Questions settings modal */}
      {showSettings && (
        <QuestionsModal
          questions={questions}
          onClose={() => setShowSettings(false)}
          onRefresh={() => { load(); }}
        />
      )}
    </div>
  )
}
