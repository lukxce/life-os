'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { ChevronDown, BookOpen } from 'lucide-react'

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
  const [entries,   setEntries]   = useState<Entry[]>([])
  const [answers,   setAnswers]   = useState<Record<string, string>>({})
  const [saved,     setSaved]     = useState(false)
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null)
  const [loading,   setLoading]   = useState(true)

  const monday  = mondayOf(new Date())
  const dateStr = toLocalISODate(monday)

  const load = useCallback(async () => {
    setLoading(true)
    const [qRes, eRes] = await Promise.all([
      fetch('/api/life/journal/questions'),
      fetch('/api/life/journal'),
    ])
    const qs: Question[] = await qRes.json()
    const es: Entry[]    = await eRes.json()
    setQuestions(qs)
    setEntries(es)
    setAnswers(es.find(e => toLocalISODate(new Date(e.date)) === dateStr)?.answers ?? {})
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
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Journal</h1>
            <p className="text-sm text-gray-400 mt-0.5">{weekLabel(monday)}</p>
          </div>

          {questions.length === 0 ? (
            <div className="bg-surface/90 dark:bg-surface/70 rounded-2xl border border-black/5 dark:border-white/5 p-8 text-center">
              <BookOpen size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-sm font-medium text-gray-500">No reflection questions yet</p>
              <p className="text-xs mt-1 text-gray-400">Add questions in settings to get started.</p>
              <Link href="/journal/settings"
                className="mt-4 inline-block px-5 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 transition-colors">
                Add questions
              </Link>
            </div>
          ) : (
            <div className="bg-surface/90 dark:bg-surface/70 rounded-2xl border border-black/5 dark:border-white/5 p-5 space-y-5">
              {questions.map(q => (
                <div key={q.id}>
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block leading-snug">
                    {q.text}
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Write your thoughts…"
                    className="w-full text-sm bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3 outline-none border border-black/10 dark:border-white/10 focus:ring-2 focus:ring-amber-300 dark:focus:ring-amber-700 resize-none leading-relaxed transition-shadow"
                    value={answers[q.id] ?? ''}
                    onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                  />
                </div>
              ))}
              <button onClick={saveAnswers}
                className={cn(
                  'w-full py-3 rounded-xl text-sm font-semibold transition-colors',
                  saved ? 'bg-green-500 text-white' : 'bg-amber-500 text-white hover:bg-amber-600',
                )}>
                {saved ? '✓ Saved' : 'Save reflection'}
              </button>
            </div>
          )}

          {pastEntries.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Past reflections</h2>
              <div className="space-y-2">
                {pastEntries.map(entry => {
                  const entryMonday = mondayOf(new Date(entry.date))
                  const label       = weekLabel(entryMonday)
                  const isOpen      = expandedEntry === entry.id
                  const answerCount = Object.values(entry.answers).filter(Boolean).length
                  return (
                    <div key={entry.id} className="bg-surface/90 dark:bg-surface/70 rounded-2xl border border-black/5 dark:border-white/5 overflow-hidden">
                      <button
                        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                        onClick={() => setExpandedEntry(isOpen ? null : entry.id)}>
                        <BookOpen size={16} className="text-gray-400 shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{label}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{answerCount} of {questions.length} answered</p>
                        </div>
                        <ChevronDown size={14} className={cn('text-gray-400 transition-transform', isOpen && 'rotate-180')} />
                      </button>
                      {isOpen && (
                        <div className="border-t border-black/5 dark:border-white/5 px-4 py-4 space-y-4">
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
    </div>
  )
}
