'use client'
import { useEffect, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Plus, Trash2, ChevronDown, BookOpen, Settings2, Home } from 'lucide-react'
import Link from 'next/link'

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

export default function JournalPage() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [entries, setEntries] = useState<Entry[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState(false)
  const [managingQuestions, setManagingQuestions] = useState(false)
  const [newQuestion, setNewQuestion] = useState('')
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

  async function addQuestion() {
    if (!newQuestion.trim()) return
    await fetch('/api/life/journal/questions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: newQuestion.trim() }) })
    setNewQuestion('')
    load()
  }

  async function deleteQuestion(id: string) {
    await fetch(`/api/life/journal/questions/${id}`, { method: 'DELETE' })
    load()
  }

  const pastEntries = entries.filter(e => toLocalISODate(new Date(e.date)) !== dateStr)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Top bar */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-xs text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1 transition-colors">
            <Home size={13} /> Life OS
          </Link>
          <span className="text-gray-300 dark:text-gray-600">/</span>
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">📓 Journal</span>
        </div>
        <button onClick={() => setManagingQuestions(!managingQuestions)}
          className={cn('p-2 rounded-xl transition-colors', managingQuestions ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600' : 'bg-gray-100 dark:bg-gray-800 text-gray-500')}>
          <Settings2 size={16} />
        </button>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 pb-12 space-y-6">
        {loading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => <div key={i} className="h-24 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse" />)}
          </div>
        ) : (
          <>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Journal</h1>
              <p className="text-sm text-gray-400 mt-0.5">{weekLabel(monday)}</p>
            </div>

            {/* Manage questions */}
            {managingQuestions && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 space-y-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Reflection questions</p>
                <div className="space-y-2">
                  {questions.map(q => (
                    <div key={q.id} className="flex items-center gap-3 group">
                      <p className="flex-1 text-sm text-gray-700 dark:text-gray-300">{q.text}</p>
                      <button onClick={() => deleteQuestion(q.id)} className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-400 transition-all">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 pt-1">
                  <input type="text" placeholder="Add a question…"
                    className="flex-1 text-sm bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2 outline-none border border-gray-200 dark:border-gray-700"
                    value={newQuestion} onChange={e => setNewQuestion(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') addQuestion() }} />
                  <button onClick={addQuestion} className="px-3 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold">
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* This week's entry */}
            {questions.length === 0 ? (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-8 text-center">
                <BookOpen size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-sm font-medium text-gray-500">No questions yet</p>
                <p className="text-xs mt-1 text-gray-400">Open settings above to add reflection questions.</p>
                <button onClick={() => setManagingQuestions(true)} className="mt-4 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold">Add questions</button>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 space-y-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">This week&apos;s reflection</p>
                {questions.map(q => (
                  <div key={q.id}>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">{q.text}</label>
                    <textarea
                      rows={3}
                      placeholder="Write your thoughts…"
                      className="w-full text-sm bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3 outline-none border border-gray-200 dark:border-gray-700 resize-none leading-relaxed"
                      value={answers[q.id] ?? ''}
                      onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                    />
                  </div>
                ))}
                <button
                  onClick={saveAnswers}
                  className={cn('w-full py-3 rounded-xl text-sm font-semibold transition-colors', saved ? 'bg-green-500 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700')}
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
                          className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
                          onClick={() => setExpandedEntry(isOpen ? null : entry.id)}
                        >
                          <BookOpen size={16} className="text-gray-400 shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{label}</p>
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
                                  {entry.answers[q.id] || <span className="text-gray-300 italic">Not answered</span>}
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
      </main>
    </div>
  )
}
