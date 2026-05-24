'use client'
import { useEffect, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Plus, Trash2, RefreshCw, X } from 'lucide-react'

interface ICSCalendar { id: string; name: string; url: string; color: string; order: number }

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f97316', '#10b981', '#3b82f6', '#14b8a6', '#ef4444']

function AddCalendarModal({ onClose, onAdd }: { onClose: () => void; onAdd: (data: Partial<ICSCalendar>) => void }) {
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [color, setColor] = useState('#6366f1')

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Add calendar</h2>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>

        <input autoFocus type="text" placeholder="Name (e.g. Work, Personal)"
          className="w-full text-sm bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3 outline-none border border-gray-200 dark:border-gray-700"
          value={name} onChange={e => setName(e.target.value)} />

        <div>
          <input type="url" placeholder="ICS URL (https://…/basic.ics)"
            className="w-full text-sm bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3 outline-none border border-gray-200 dark:border-gray-700"
            value={url} onChange={e => setUrl(e.target.value)} />
          <p className="text-xs text-gray-400 mt-1.5">Google Calendar: Settings → calendar → Secret iCal address</p>
        </div>

        <div>
          <label className="text-xs text-gray-400 font-medium mb-1.5 block">Color</label>
          <div className="flex gap-2">
            {COLORS.map(c => (
              <button key={c} onClick={() => setColor(c)} className={cn('w-7 h-7 rounded-full', color === c && 'ring-2 ring-offset-2 ring-gray-400')} style={{ backgroundColor: c }} />
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm font-medium text-gray-600 dark:text-gray-400">Cancel</button>
          <button
            onClick={() => { if (name.trim() && url.trim()) { onAdd({ name: name.trim(), url: url.trim(), color }); onClose() } }}
            className="flex-1 py-3 rounded-xl bg-indigo-600 text-sm font-semibold text-white"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const [calendars, setCalendars] = useState<ICSCalendar[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [refreshing, setRefreshing] = useState<string | null>(null)
  const [refreshStatus, setRefreshStatus] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/life/ics-calendars')
    setCalendars(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function addCalendar(data: Partial<ICSCalendar>) {
    await fetch('/api/life/ics-calendars', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    load()
  }

  async function deleteCalendar(id: string) {
    await fetch(`/api/life/ics-calendars/${id}`, { method: 'DELETE' })
    setCalendars(prev => prev.filter(c => c.id !== id))
  }

  async function testCalendar(cal: ICSCalendar) {
    setRefreshing(cal.id)
    setRefreshStatus(prev => ({ ...prev, [cal.id]: 'loading' }))
    try {
      const res = await fetch(`/api/ics?url=${encodeURIComponent(cal.url)}`)
      const data = await res.json()
      if (!res.ok) {
        setRefreshStatus(prev => ({ ...prev, [cal.id]: `Error: ${data.error}` }))
      } else {
        setRefreshStatus(prev => ({ ...prev, [cal.id]: `✓ ${data.length} events loaded` }))
      }
    } catch {
      setRefreshStatus(prev => ({ ...prev, [cal.id]: 'Failed to connect' }))
    } finally {
      setRefreshing(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-gray-400 mt-0.5">Calendars and preferences</p>
      </div>

      {/* ICS Calendars */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">Connected Calendars</h2>
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold">
            <Plus size={13} /> Add
          </button>
        </div>

        {loading ? (
          <div className="h-20 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse" />
        ) : calendars.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 text-center">
            <p className="text-sm text-gray-500">No calendars connected yet</p>
            <p className="text-xs text-gray-400 mt-1">Connect Google Calendar or Outlook to see your events alongside your schedule.</p>
            <button onClick={() => setShowAdd(true)} className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold">Connect calendar</button>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800 overflow-hidden">
            {calendars.map(cal => (
              <div key={cal.id} className="px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cal.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{cal.name}</p>
                    <p className="text-xs text-gray-400 truncate mt-0.5">{cal.url}</p>
                    {refreshStatus[cal.id] && refreshStatus[cal.id] !== 'loading' && (
                      <p className={cn('text-xs mt-0.5', refreshStatus[cal.id].startsWith('✓') ? 'text-green-500' : 'text-red-400')}>
                        {refreshStatus[cal.id]}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => testCalendar(cal)}
                      disabled={refreshing === cal.id}
                      className="p-1.5 rounded-xl text-gray-400 hover:text-indigo-500 transition-colors disabled:opacity-50"
                      title="Test connection"
                    >
                      <RefreshCw size={14} className={refreshing === cal.id ? 'animate-spin' : ''} />
                    </button>
                    <button onClick={() => deleteCalendar(cal.id)} className="p-1.5 rounded-xl text-gray-400 hover:text-red-400 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {showAdd && <AddCalendarModal onClose={() => setShowAdd(false)} onAdd={addCalendar} />}
    </div>
  )
}
