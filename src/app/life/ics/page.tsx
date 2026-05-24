'use client'
import { useEffect, useState, useCallback } from 'react'
import { Calendar, MapPin, Clock, Loader2, RefreshCw, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface ICSCalendarConfig { id: string; name: string; url: string; color: string }
interface ICSEvent {
  uid: string; summary: string; start: string; end: string
  location?: string; description?: string; allDay: boolean
  calendarId?: string; calendarColor?: string; calendarName?: string
}

const WEEK_MS = 7 * 86400000

function startOfWeek(d: Date): Date {
  const c = new Date(d); c.setHours(0,0,0,0)
  const day = c.getDay()
  c.setDate(c.getDate() - (day === 0 ? 6 : day - 1))
  return c
}

function formatTime(iso: string, allDay: boolean): string {
  if (allDay) return 'All day'
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function formatDuration(start: string, end: string, allDay: boolean): string {
  if (allDay) return 'All day'
  const mins = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000)
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60), m = mins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function EventCard({ ev }: { ev: ICSEvent }) {
  const [open, setOpen] = useState(false)
  const color = ev.calendarColor ?? '#6366f1'
  return (
    <div
      className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden cursor-pointer hover:shadow-sm transition-shadow"
      onClick={() => setOpen(!open)}
      style={{ borderLeftColor: color, borderLeftWidth: 3 }}
    >
      <div className="px-3.5 py-3 flex items-start gap-3">
        <div className="mt-0.5 shrink-0 w-1.5 h-1.5 rounded-full mt-1.5" style={{ backgroundColor: color }} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{ev.summary}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Clock size={10} /> {formatTime(ev.start, ev.allDay)}
              {!ev.allDay && <span className="text-gray-300">· {formatDuration(ev.start, ev.end, ev.allDay)}</span>}
            </span>
            {ev.calendarName && (
              <span className="text-xs font-medium px-1.5 py-0.5 rounded-full" style={{ backgroundColor: color + '22', color }}>
                {ev.calendarName}
              </span>
            )}
          </div>
          {ev.location && (
            <p className="flex items-center gap-1 text-xs text-gray-400 mt-1">
              <MapPin size={10} className="shrink-0" /> <span className="truncate">{ev.location}</span>
            </p>
          )}
          {open && ev.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 whitespace-pre-wrap leading-relaxed border-t border-gray-100 dark:border-gray-800 pt-2">
              {ev.description.slice(0, 400)}{ev.description.length > 400 ? '…' : ''}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ICSPage() {
  const [calendars, setCalendars] = useState<ICSCalendarConfig[]>([])
  const [events, setEvents] = useState<ICSEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [weekOffset, setWeekOffset] = useState(0)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const weekStart = startOfWeek(new Date(Date.now() + weekOffset * WEEK_MS))
  const weekEnd = new Date(weekStart.getTime() + WEEK_MS - 1)
  const weekLabel = `${weekStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${weekEnd.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`

  const fetchEvents = useCallback(async (cals: ICSCalendarConfig[]) => {
    if (cals.length === 0) return
    setLoading(true)
    setErrors([])
    const allEvents: ICSEvent[] = []
    const errs: string[] = []
    await Promise.all(cals.map(async cal => {
      try {
        const res = await fetch(`/api/life/ics?url=${encodeURIComponent(cal.url)}`)
        const data = await res.json()
        if (!res.ok) { errs.push(`${cal.name}: ${data.error}`); return }
        for (const ev of data) {
          allEvents.push({ ...ev, calendarId: cal.id, calendarColor: cal.color, calendarName: cal.name })
        }
      } catch (e) { errs.push(`${cal.name}: ${String(e)}`) }
    }))
    allEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    setEvents(allEvents)
    setErrors(errs)
    setLastRefresh(new Date())
    setLoading(false)
  }, [])

  useEffect(() => {
    fetch('/api/life/ics-calendars').then(r => r.json()).then((cals: ICSCalendarConfig[]) => {
      setCalendars(cals)
      fetchEvents(cals)
    })
  }, [fetchEvents])

  // Group events for selected week by day
  const weekEnd2 = new Date(weekStart.getTime() + WEEK_MS)
  const dayMap = new Map<string, ICSEvent[]>()
  let allDay: ICSEvent[] = []
  for (const ev of events) {
    const d = new Date(ev.start)
    if (d < weekStart || d >= weekEnd2) continue
    if (ev.allDay) { allDay.push(ev); continue }
    const key = d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })
    if (!dayMap.has(key)) dayMap.set(key, [])
    dayMap.get(key)!.push(ev)
  }

  const thisWeekCount = Array.from(dayMap.values()).reduce((s, v) => s + v.length, 0) + allDay.length
  const futureTotal = events.filter(e => new Date(e.start) >= weekStart).length

  if (calendars.length === 0 && !loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Calendar</h1>
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-10 text-center">
          <Calendar size={36} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-sm font-medium text-gray-500">No calendars connected</p>
          <p className="text-xs text-gray-400 mt-1">Add your Google Calendar or Outlook ICS URL in settings.</p>
          <Link href="/settings" className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold">
            <Settings size={15} /> Open Settings
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Calendar</h1>
          {lastRefresh && <p className="text-xs text-gray-400 mt-0.5">Updated {lastRefresh.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</p>}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchEvents(calendars)}
            disabled={loading}
            className="p-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-indigo-500 transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <Link href="/settings" className="p-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-indigo-500 transition-colors">
            <Settings size={16} />
          </Link>
        </div>
      </div>

      {/* Calendar legend */}
      <div className="flex flex-wrap gap-2">
        {calendars.map(cal => (
          <span key={cal.id} className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full" style={{ backgroundColor: cal.color + '18', color: cal.color }}>
            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: cal.color }} />
            {cal.name}
          </span>
        ))}
      </div>

      {/* Week nav */}
      <div className="flex items-center justify-between">
        <button onClick={() => setWeekOffset(o => o - 1)} className="px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">← Prev</button>
        <div className="text-center">
          <p className="text-sm font-semibold">{weekLabel}</p>
          <p className="text-xs text-gray-400">{thisWeekCount} events</p>
        </div>
        <button onClick={() => setWeekOffset(o => o + 1)} className="px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">Next →</button>
      </div>

      {errors.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 space-y-1">
          {errors.map((e, i) => <p key={i} className="text-xs text-red-500">{e}</p>)}
        </div>
      )}

      {loading && <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />)}</div>}

      {!loading && (
        <>
          {allDay.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">All day</h2>
              <div className="space-y-2">{allDay.map(ev => <EventCard key={ev.uid} ev={ev} />)}</div>
            </section>
          )}

          {dayMap.size === 0 && allDay.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <Calendar size={28} className="mx-auto mb-2" />
              <p className="text-sm">No events this week</p>
            </div>
          )}

          {Array.from(dayMap.entries()).map(([day, evs]) => (
            <section key={day}>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">{day}</h2>
              <div className="space-y-2">{evs.map(ev => <EventCard key={ev.uid + ev.start} ev={ev} />)}</div>
            </section>
          ))}

          {futureTotal > thisWeekCount && (
            <p className="text-xs text-center text-gray-400 pt-2">{futureTotal} total upcoming events across all calendars</p>
          )}
        </>
      )}
    </div>
  )
}
