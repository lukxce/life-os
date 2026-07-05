'use client'
import { useEffect, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Plus, Trash2, RefreshCw, X, ArrowLeft, MapPin, Link2, Check } from 'lucide-react'
import Link from 'next/link'

interface ICSCalendar { id: string; name: string; url: string; color: string; order: number }

const COLORS = ['#6366f1','#8b5cf6','#ec4899','#f97316','#10b981','#3b82f6','#14b8a6','#ef4444']

function AddCalendarModal({ onClose, onAdd }: { onClose: () => void; onAdd: (data: Partial<ICSCalendar>) => void }) {
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [color, setColor] = useState('#6366f1')

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white/85 dark:bg-gray-900/70 rounded-2xl w-full max-w-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold dark:text-white">Add calendar</h2>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>

        <input autoFocus type="text" placeholder="Name (e.g. Work, Personal)"
          className="w-full text-sm bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3 outline-none border border-black/10 dark:border-white/10 dark:text-white"
          value={name} onChange={e => setName(e.target.value)} />

        <div>
          <input type="url" placeholder="ICS URL (https://…/basic.ics)"
            className="w-full text-sm bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3 outline-none border border-black/10 dark:border-white/10 dark:text-white"
            value={url} onChange={e => setUrl(e.target.value)} />
          <p className="text-xs text-gray-400 mt-1.5">Google Calendar: Settings → calendar → Secret iCal address</p>
        </div>

        <div>
          <label className="text-xs text-gray-400 font-medium mb-1.5 block">Color</label>
          <div className="flex gap-2 flex-wrap">
            {COLORS.map(c => (
              <button key={c} onClick={() => setColor(c)}
                className={cn('w-7 h-7 rounded-full transition-all', color === c && 'ring-2 ring-offset-2 ring-gray-400')}
                style={{ backgroundColor: c }} />
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm font-medium text-gray-600 dark:text-gray-400">Cancel</button>
          <button
            onClick={() => { if (name.trim() && url.trim()) { onAdd({ name: name.trim(), url: url.trim(), color }); onClose() } }}
            className="flex-1 py-3 rounded-xl bg-indigo-600 text-sm font-semibold text-white disabled:opacity-50"
            disabled={!name.trim() || !url.trim()}
          >Add</button>
        </div>
      </div>
    </div>
  )
}

export default function ScheduleSettingsPage() {
  const [calendars, setCalendars] = useState<ICSCalendar[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [refreshing, setRefreshing] = useState<string | null>(null)
  const [refreshStatus, setRefreshStatus] = useState<Record<string, string>>({})

  // Location + meeting link
  const [location, setLocation] = useState('')
  const [meetingLink, setMeetingLink] = useState('')
  const [settingsSaved, setSettingsSaved] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [calRes, settingsRes] = await Promise.all([
      fetch('/api/life/ics-calendars'),
      fetch('/api/life/schedule-settings'),
    ])
    setCalendars(await calRes.json())
    const settings = await settingsRes.json()
    setLocation(settings.location ?? '')
    setMeetingLink(settings.meetingLink ?? '')
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
      const res = await fetch(`/api/life/ics?url=${encodeURIComponent(cal.url)}`)
      const data = await res.json()
      setRefreshStatus(prev => ({ ...prev, [cal.id]: res.ok ? `✓ ${data.length} events loaded` : `Error: ${data.error}` }))
    } catch {
      setRefreshStatus(prev => ({ ...prev, [cal.id]: 'Failed to connect' }))
    } finally {
      setRefreshing(null)
    }
  }

  async function saveSettings() {
    setSavingSettings(true)
    await fetch('/api/life/schedule-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ location, meetingLink }),
    })
    setSavingSettings(false)
    setSettingsSaved(true)
    setTimeout(() => setSettingsSaved(false), 2000)
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white/85 dark:bg-gray-900/70 border-b border-black/5 dark:border-white/5 px-4 sm:px-6 py-3 flex items-center gap-3">
        <Link href="/schedule" className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <ArrowLeft size={17} />
        </Link>
        <div>
          <h1 className="text-sm font-semibold text-gray-900 dark:text-white">Schedule settings</h1>
          <p className="text-xs text-gray-400">Calendars, location &amp; sharing</p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-8">

        {/* ── Your info ─────────────────────────────────────────── */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Your info</h2>
          <div className="bg-white/85 dark:bg-gray-900/70 rounded-2xl border border-black/5 dark:border-white/5 p-5 space-y-4">
            <p className="text-xs text-gray-400">Shown on your public share link so people know where you&apos;re based and how to book time with you.</p>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                <MapPin size={12} /> Current location
              </label>
              <input
                type="text"
                placeholder="e.g. Dubai, UAE"
                className="w-full text-sm bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-2.5 outline-none border border-black/10 dark:border-white/10 focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-700 dark:text-white"
                value={location}
                onChange={e => setLocation(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                <Link2 size={12} /> Meeting link
              </label>
              <input
                type="url"
                placeholder="e.g. https://calendly.com/yourname"
                className="w-full text-sm bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-2.5 outline-none border border-black/10 dark:border-white/10 focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-700 dark:text-white"
                value={meetingLink}
                onChange={e => setMeetingLink(e.target.value)}
              />
              <p className="text-xs text-gray-400">Calendly, Cal.com, Google Meet invite, etc.</p>
            </div>

            <button
              onClick={saveSettings}
              disabled={savingSettings}
              className={cn(
                'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors',
                settingsSaved ? 'bg-green-500 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50'
              )}
            >
              {settingsSaved ? <><Check size={14} /> Saved</> : 'Save'}
            </button>
          </div>
        </section>

        {/* ── Connected calendars ───────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">Connected calendars</h2>
            <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold">
              <Plus size={13} /> Add
            </button>
          </div>

          {loading ? (
            <div className="h-20 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse" />
          ) : calendars.length === 0 ? (
            <div className="bg-white/85 dark:bg-gray-900/70 rounded-2xl border border-black/5 dark:border-white/5 p-6 text-center">
              <p className="text-sm text-gray-500">No calendars connected yet</p>
              <p className="text-xs text-gray-400 mt-1">Connect Google Calendar or Outlook to see events alongside your schedule.</p>
              <button onClick={() => setShowAdd(true)} className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold">Connect calendar</button>
            </div>
          ) : (
            <div className="bg-white/85 dark:bg-gray-900/70 rounded-2xl border border-black/5 dark:border-white/5 divide-y divide-black/5 dark:divide-white/5 overflow-hidden">
              {calendars.map(cal => (
                <div key={cal.id} className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cal.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium dark:text-white truncate">{cal.name}</p>
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

      </main>

      {showAdd && <AddCalendarModal onClose={() => setShowAdd(false)} onAdd={addCalendar} />}
    </div>
  )
}
