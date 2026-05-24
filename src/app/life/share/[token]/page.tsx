'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'

interface ICSEvent {
  uid: string; summary: string; start: string; end: string
  location?: string; allDay: boolean; calendarName?: string; calendarColor?: string
}
interface CalendarMeta { name: string; color: string }
interface ApiResponse { events: ICSEvent[]; isBusy: boolean; calendars: CalendarMeta[] }

const DAYS = [
  { key: 'mon', short: 'Mon' },
  { key: 'tue', short: 'Tue' },
  { key: 'wed', short: 'Wed' },
  { key: 'thu', short: 'Thu' },
  { key: 'fri', short: 'Fri' },
  { key: 'sat', short: 'Sat' },
  { key: 'sun', short: 'Sun' },
]
const JS_DAY_TO_KEY: Record<number, string> = { 1:'mon',2:'tue',3:'wed',4:'thu',5:'fri',6:'sat',0:'sun' }
const HOURS = Array.from({ length: 17 }, (_, i) => i + 8)
const DAY_START = 8 * 60
const DAY_END = 24 * 60 + 30
const PX_PER_MIN = 1.2

function minutesToPx(m: number) { return (m - DAY_START) * PX_PER_MIN }
function getMondayOfWeek(d: Date): Date {
  const copy = new Date(d); copy.setHours(0,0,0,0)
  const day = copy.getDay()
  copy.setDate(copy.getDate() - (day === 0 ? 6 : day - 1))
  return copy
}
function getDateForDayKey(key: string, monday: Date): Date {
  const offsets: Record<string, number> = { mon:0,tue:1,wed:2,thu:3,fri:4,sat:5,sun:6 }
  const result = new Date(monday); result.setDate(monday.getDate() + (offsets[key] ?? 0))
  return result
}
function weekRangeLabel(monday: Date): string {
  const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6)
  const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  if (monday.getMonth() !== sunday.getMonth())
    return `${fmt(monday)} – ${fmt(sunday)} ${sunday.getFullYear()}`
  return `${monday.getDate()} – ${sunday.getDate()} ${sunday.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}`
}
function toLocalDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function EventBlock({ ev }: { ev: ICSEvent }) {
  const color = ev.calendarColor ?? '#6366f1'
  const start = new Date(ev.start)
  const end = new Date(ev.end)
  const startMin = start.getHours() * 60 + start.getMinutes()
  const endMin = end.getHours() * 60 + end.getMinutes() || startMin + 60
  const clampedStart = Math.max(startMin, DAY_START)
  const clampedEnd = Math.min(endMin, DAY_END)
  if (clampedEnd <= clampedStart) return null
  const top = minutesToPx(clampedStart)
  const height = Math.max(minutesToPx(clampedEnd) - minutesToPx(clampedStart), 22)
  const isShort = height < 44
  const timeStr = `${String(start.getHours()).padStart(2,'0')}:${String(start.getMinutes()).padStart(2,'0')}`

  return (
    <div style={{ position:'absolute',top,left:0,right:0,height,background:color+'18',borderLeft:`3px solid ${color}`,borderRadius:6,padding:isShort?'2px 8px':'5px 10px',overflow:'hidden',boxSizing:'border-box' }}>
      <div style={{ display:'flex',alignItems:'center',gap:5,overflow:'hidden' }}>
        <span style={{ fontSize:11,fontWeight:600,color,whiteSpace:'nowrap',flexShrink:0 }}>{timeStr}</span>
        <span style={{ fontSize:11,fontWeight:700,color,overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis' }}>{ev.summary}</span>
      </div>
      {!isShort && ev.location && <div style={{ fontSize:10,color:color+'cc',marginTop:2,overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis' }}>📍 {ev.location}</div>}
    </div>
  )
}

export default function SharePage() {
  const { token } = useParams<{ token: string }>()
  const [data, setData] = useState<ApiResponse | null>(null)
  const [error, setError] = useState(false)
  const [activeDay, setActiveDay] = useState('mon')
  const [selectedMonday, setSelectedMonday] = useState(() => getMondayOfWeek(new Date()))

  useEffect(() => {
    setActiveDay(JS_DAY_TO_KEY[new Date().getDay()] ?? 'mon')
  }, [])

  const load = useCallback(async () => {
    const res = await fetch(`/api/life/public/ics?token=${token}`)
    if (!res.ok) { setError(true); return }
    setData(await res.json())
  }, [token])

  useEffect(() => { load() }, [load])

  function prevWeek() { setSelectedMonday(m => { const d = new Date(m); d.setDate(m.getDate() - 7); return d }) }
  function nextWeek() { setSelectedMonday(m => { const d = new Date(m); d.setDate(m.getDate() + 7); return d }) }

  const isCurrentWeek = toLocalDateStr(selectedMonday) === toLocalDateStr(getMondayOfWeek(new Date()))
  const todayKey = JS_DAY_TO_KEY[new Date().getDay()]
  const totalHeight = minutesToPx(DAY_END) + 20

  const selectedDate = getDateForDayKey(activeDay, selectedMonday)
  const dayStart = new Date(selectedDate); dayStart.setHours(0,0,0,0)
  const dayEnd = new Date(selectedDate); dayEnd.setHours(23,59,59,999)
  const dayEvents = (data?.events ?? []).filter(ev => {
    const d = new Date(ev.start)
    return d >= dayStart && d <= dayEnd && !ev.allDay
  })
  const allDayEvents = (data?.events ?? []).filter(ev => {
    const d = new Date(ev.start)
    return d >= dayStart && d <= dayEnd && ev.allDay
  })

  if (error) return (
    <div style={{ minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#F9FAFB' }}>
      <div style={{ textAlign:'center' }}>
        <p style={{ fontSize:18,fontWeight:700,color:'#111827',marginBottom:8 }}>Link not valid</p>
        <p style={{ fontSize:14,color:'#6B7280' }}>This calendar link has expired or doesn't exist.</p>
      </div>
    </div>
  )

  if (!data) return (
    <div style={{ minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#F9FAFB' }}>
      <div style={{ width:32,height:32,border:'3px solid #e5e7eb',borderTopColor:'#6366f1',borderRadius:'50%',animation:'spin 0.7s linear infinite' }} />
    </div>
  )

  return (
    <div style={{ minHeight:'100vh',background:'#F9FAFB',padding:'24px 16px' }}>
      <div style={{ maxWidth:640,margin:'0 auto' }}>

        <div style={{ marginBottom:20 }}>
          <h1 style={{ fontSize:22,fontWeight:700,color:'#111827',marginBottom:4 }}>Calendar</h1>
          <p style={{ fontSize:13,color:'#9CA3AF' }}>
            {data.isBusy ? 'Availability only' : 'Full calendar'}
          </p>
          {!data.isBusy && data.calendars.length > 0 && (
            <div style={{ display:'flex',gap:12,marginTop:8,flexWrap:'wrap' }}>
              {data.calendars.map(cal => (
                <div key={cal.name} style={{ display:'flex',alignItems:'center',gap:5 }}>
                  <span style={{ width:8,height:8,borderRadius:'50%',background:cal.color,display:'inline-block',flexShrink:0 }} />
                  <span style={{ fontSize:12,color:'#6B7280' }}>{cal.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Week nav */}
        <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:14 }}>
          <button onClick={prevWeek} style={{ display:'flex',alignItems:'center',justifyContent:'center',padding:'7px 10px',borderRadius:10,border:'1.5px solid #e5e7eb',background:'#fff',cursor:'pointer' }}>
            <ChevronLeft size={16} color="#374151" />
          </button>
          <div style={{ flex:1,textAlign:'center',display:'flex',alignItems:'center',justifyContent:'center',gap:8 }}>
            <span style={{ fontSize:14,fontWeight:600,color:'#111827' }}>{weekRangeLabel(selectedMonday)}</span>
            {!isCurrentWeek && (
              <button onClick={() => setSelectedMonday(getMondayOfWeek(new Date()))} style={{ fontSize:11,fontWeight:600,color:'#6366f1',background:'#EEF2FF',border:'none',borderRadius:99,padding:'2px 8px',cursor:'pointer' }}>Today</button>
            )}
          </div>
          <label style={{ display:'flex',alignItems:'center',justifyContent:'center',padding:'7px 10px',borderRadius:10,border:'1.5px solid #e5e7eb',background:'#fff',cursor:'pointer',position:'relative' }}>
            <Calendar size={14} color="#374151" />
            <input type="date" style={{ position:'absolute',opacity:0,width:'100%',height:'100%',top:0,left:0,cursor:'pointer' }}
              onChange={e => { if (e.target.value) setSelectedMonday(getMondayOfWeek(new Date(e.target.value + 'T12:00:00'))) }} />
          </label>
          <button onClick={nextWeek} style={{ display:'flex',alignItems:'center',justifyContent:'center',padding:'7px 10px',borderRadius:10,border:'1.5px solid #e5e7eb',background:'#fff',cursor:'pointer' }}>
            <ChevronRight size={16} color="#374151" />
          </button>
        </div>

        {/* Day tabs */}
        <div style={{ display:'flex',gap:6,marginBottom:16,overflowX:'auto' } as React.CSSProperties}>
          {DAYS.map(d => {
            const isActive = activeDay === d.key
            const isToday = todayKey === d.key && isCurrentWeek
            const dateNum = getDateForDayKey(d.key, selectedMonday).getDate()
            return (
              <button key={d.key} onClick={() => setActiveDay(d.key)}
                style={{ padding:'6px 14px',borderRadius:99,border:isActive?'1.5px solid #6366f1':'1.5px solid #e5e7eb',background:isActive?'#6366f1':'#fff',color:isActive?'#fff':'#374151',fontWeight:600,fontSize:13,cursor:'pointer',position:'relative',flexShrink:0,display:'flex',flexDirection:'column',alignItems:'center',gap:1 }}>
                <span>{d.short}</span>
                <span style={{ fontSize:10,opacity:0.7 }}>{dateNum}</span>
                {isToday && <span style={{ position:'absolute',top:2,right:4,width:5,height:5,borderRadius:'50%',background:isActive?'rgba(255,255,255,0.7)':'#6366f1' }} />}
              </button>
            )
          })}
        </div>

        {/* All-day events */}
        {allDayEvents.length > 0 && (
          <div style={{ background:'#fff',border:'1px solid #e5e7eb',borderRadius:12,padding:'10px 16px',marginBottom:12,display:'flex',flexWrap:'wrap',gap:6 }}>
            {allDayEvents.map(ev => {
              const color = ev.calendarColor ?? '#6366f1'
              return (
                <span key={ev.uid} style={{ fontSize:12,fontWeight:600,color,background:color+'15',borderRadius:99,padding:'3px 10px' }}>
                  {data.isBusy ? '● Busy all day' : ev.summary}
                </span>
              )
            })}
          </div>
        )}

        {/* Timeline */}
        <div style={{ background:'#fff',border:'1px solid #e5e7eb',borderRadius:14,padding:'16px 16px 16px 0' }}>
          <div style={{ display:'flex' }}>
            <div style={{ width:48,flexShrink:0,position:'relative',height:totalHeight }}>
              {HOURS.map(h => (
                <div key={h} style={{ position:'absolute',top:minutesToPx(h*60),right:8,fontSize:10,color:'#9CA3AF',fontWeight:500,lineHeight:1,transform:'translateY(-50%)',whiteSpace:'nowrap' }}>
                  {h === 24 ? '00:00' : `${String(h).padStart(2,'0')}:00`}
                </div>
              ))}
            </div>
            <div style={{ flex:1,position:'relative',height:totalHeight }}>
              {HOURS.map(h => <div key={h} style={{ position:'absolute',top:minutesToPx(h*60),left:0,right:0,height:1,background:'#F3F4F6' }} />)}
              {dayEvents.length === 0 && (
                <div style={{ position:'absolute',top:80,left:0,right:0,textAlign:'center',color:'#D1D5DB',fontSize:13 }}>No events</div>
              )}
              {dayEvents.map(ev => <EventBlock key={ev.uid + ev.start} ev={ev} />)}
            </div>
          </div>
        </div>

        <p style={{ fontSize:11,color:'#D1D5DB',textAlign:'center',marginTop:16 }}>Powered by Life OS</p>
      </div>
    </div>
  )
}
