'use client'
import { useEffect, useState, useCallback } from 'react'
import { Pencil, X, Plus, RefreshCw, ChevronLeft, ChevronRight, Calendar, Share2, Check, Settings, Users } from 'lucide-react'
import Link from 'next/link'
import { BlockModal, BlockFormData } from '@/components/schedule/BlockModal'

type ScheduleBlock = {
  id: string; day: string; startTime: string; endTime: string | null
  name: string; note: string | null; category: string; sacred: boolean
  frequency: string; biweeklyRef: number | null
}
type ScheduleDay = { id: string; day: string; label: string | null; summary: string | null }
type ApiResponse = { blocks: Record<string, ScheduleBlock[]>; days: Record<string, ScheduleDay> }
interface ICSCalendarConfig { id: string; name: string; url: string; color: string }
interface ICSEvent { uid: string; summary: string; start: string; end: string; location?: string; allDay: boolean; calendarColor?: string; calendarName?: string; calendarId?: string }

const DAYS = [
  { key: 'mon', short: 'Mon', full: 'Monday' },
  { key: 'tue', short: 'Tue', full: 'Tuesday' },
  { key: 'wed', short: 'Wed', full: 'Wednesday' },
  { key: 'thu', short: 'Thu', full: 'Thursday' },
  { key: 'fri', short: 'Fri', full: 'Friday' },
  { key: 'sat', short: 'Sat', full: 'Saturday' },
  { key: 'sun', short: 'Sun', full: 'Sunday' },
]
const JS_DAY_TO_KEY: Record<number, string> = { 1:'mon',2:'tue',3:'wed',4:'thu',5:'fri',6:'sat',0:'sun' }

const CATEGORY_COLORS: Record<string, { bg:string;border:string;timeColor:string;nameColor:string;noteColor:string;dot:string }> = {
  ritual:   { bg:'#F5F4FE',border:'#7F77DD',timeColor:'#534AB7',nameColor:'#3C3489',noteColor:'#534AB7',dot:'#7F77DD' },
  hypefy:   { bg:'#E6F1FB',border:'#378ADD',timeColor:'#185FA5',nameColor:'#0C447C',noteColor:'#185FA5',dot:'#378ADD' },
  agency:   { bg:'#FAEEDA',border:'#EF9F27',timeColor:'#854F0B',nameColor:'#633806',noteColor:'#854F0B',dot:'#EF9F27' },
  pt:       { bg:'#EAF3DE',border:'#639922',timeColor:'#3B6D11',nameColor:'#27500A',noteColor:'#3B6D11',dot:'#639922' },
  food:     { bg:'#FCEBEB',border:'#E24B4A',timeColor:'#A32D2D',nameColor:'#791F1F',noteColor:'#A32D2D',dot:'#E24B4A' },
  social:   { bg:'#FBEAF0',border:'#D4537E',timeColor:'#993556',nameColor:'#72243E',noteColor:'#993556',dot:'#D4537E' },
  property: { bg:'#F1EFE8',border:'#888780',timeColor:'#5F5E5A',nameColor:'#444441',noteColor:'#5F5E5A',dot:'#888780' },
  sleep:    { bg:'#EEEDFE',border:'#534AB7',timeColor:'#3C3489',nameColor:'#26215C',noteColor:'#3C3489',dot:'#534AB7' },
}
const CATEGORY_LABELS: Record<string,string> = { ritual:'Ritual',hypefy:'Hypefy',agency:'Agency',pt:'PT',food:'Food',social:'Social',property:'Property',sleep:'Sleep' }
const HOURS = Array.from({ length: 17 }, (_, i) => i + 8)
const DAY_START = 8 * 60
const DAY_END = 24 * 60 + 30
const PX_PER_MIN = 1.2
const COL_WIDTH = 280

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return (h === 0 ? 24 : h) * 60 + (m ?? 0)
}
function minutesToPx(m: number): number { return (m - DAY_START) * PX_PER_MIN }

function getISOWeekParity(monday: Date): number {
  const d = new Date(monday)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7)
  const week1 = new Date(d.getFullYear(), 0, 4)
  const weekNum = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7)
  return weekNum % 2
}

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

function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function ScheduleBlock_({ block, editMode, onEdit, onDelete }: { block: ScheduleBlock; editMode: boolean; onEdit: (b: ScheduleBlock) => void; onDelete: (b: ScheduleBlock) => void }) {
  const colors = CATEGORY_COLORS[block.category] ?? CATEGORY_COLORS.ritual
  const startMin = timeToMinutes(block.startTime)
  const endMin = block.endTime ? timeToMinutes(block.endTime) : startMin + 30
  const top = minutesToPx(startMin)
  const height = Math.max(minutesToPx(endMin) - minutesToPx(startMin), 24)
  const isShort = height < 50

  return (
    <div style={{ position:'absolute',top,left:0,right:0,height,background:colors.bg,borderLeft:`3px solid ${colors.border}`,borderRadius:6,padding:isShort?'3px 8px':'6px 10px',overflow:'hidden',boxSizing:'border-box' }}>
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',gap:4,overflow:'hidden' }}>
        <div style={{ display:'flex',alignItems:'center',gap:6,overflow:'hidden',flex:1,minWidth:0 }}>
          <span style={{ fontSize:11,fontWeight:600,color:colors.timeColor,whiteSpace:'nowrap',flexShrink:0 }}>
            {block.startTime}{!isShort && block.endTime ? ` – ${block.endTime}` : ''}
          </span>
          <span style={{ fontSize:12,fontWeight:700,color:colors.nameColor,overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis' }}>{block.name}</span>
          {block.sacred && <span style={{ fontSize:9,fontWeight:700,color:'#7C3AED',background:'#EDE9FE',border:'1px solid #C4B5FD',borderRadius:99,padding:'0px 5px',whiteSpace:'nowrap',flexShrink:0 }}>sacred</span>}
          {block.frequency === 'biweekly' && <span style={{ fontSize:9,fontWeight:700,color:'#d97706',background:'#fef3c7',border:'1px solid #fde68a',borderRadius:99,padding:'0px 5px',whiteSpace:'nowrap',flexShrink:0 }}>2w</span>}
        </div>
        {editMode && (
          <div style={{ display:'flex',gap:4,flexShrink:0 }}>
            <button onClick={() => onEdit(block)} style={{ background:'rgba(255,255,255,0.85)',border:'1px solid #e5e7eb',borderRadius:5,padding:'2px 5px',cursor:'pointer',display:'flex',alignItems:'center' }}><Pencil size={11} color="#6366f1" /></button>
            <button onClick={() => onDelete(block)} style={{ background:'rgba(255,255,255,0.85)',border:'1px solid #e5e7eb',borderRadius:5,padding:'2px 5px',cursor:'pointer',display:'flex',alignItems:'center' }}><X size={11} color="#ef4444" /></button>
          </div>
        )}
      </div>
      {!isShort && block.note && <p style={{ fontSize:11,color:colors.noteColor,marginTop:3,lineHeight:1.4,overflow:'hidden',display:'-webkit-box',WebkitLineClamp:3,WebkitBoxOrient:'vertical' } as React.CSSProperties}>{block.note}</p>}
    </div>
  )
}

function ICSBlock({ ev }: { ev: ICSEvent }) {
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
      <div style={{ fontSize:11,fontWeight:600,color,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>{timeStr} {ev.summary}</div>
      {!isShort && ev.location && <div style={{ fontSize:10,color:color+'cc',marginTop:2,overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis' }}>📍 {ev.location}</div>}
    </div>
  )
}

export default function SchedulePage() {
  const [data, setData] = useState<ApiResponse | null>(null)
  const [activeDay, setActiveDay] = useState<string>('mon')
  const [editMode, setEditMode] = useState(false)
  const [modal, setModal] = useState<{ mode:'add' } | { mode:'edit';block:ScheduleBlock } | null>(null)
  const [dayLabel, setDayLabel] = useState<Record<string,string>>({})
  const [daySummary, setDaySummary] = useState<Record<string,string>>({})
  const [icsCalendars, setIcsCalendars] = useState<ICSCalendarConfig[]>([])
  const [icsEvents, setIcsEvents] = useState<ICSEvent[]>([])
  const [icsLoading, setIcsLoading] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [mobileCalendarId, setMobileCalendarId] = useState<string | null>(null)
  const [selectedMonday, setSelectedMonday] = useState<Date>(() => getMondayOfWeek(new Date()))
  const [shareToken, setShareToken] = useState<{ busyToken: string; publicToken: string } | null>(null)
  const [showSharePanel, setShowSharePanel] = useState(false)
  const [copied, setCopied] = useState<'busy' | 'public' | null>(null)
  const [origin, setOrigin] = useState('')

  useEffect(() => { setOrigin(window.location.origin) }, [])

  useEffect(() => {
    const today = JS_DAY_TO_KEY[new Date().getDay()] ?? 'mon'
    setActiveDay(today)
  }, [])

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const loadData = useCallback(async () => {
    const res = await fetch('/api/life/schedule')
    const json: ApiResponse = await res.json()
    setData(json)
    const labels: Record<string,string> = {}, summaries: Record<string,string> = {}
    for (const d of Object.values(json.days)) { labels[d.day] = d.label ?? ''; summaries[d.day] = d.summary ?? '' }
    setDayLabel(labels); setDaySummary(summaries)
  }, [])

  const loadICS = useCallback(async () => {
    const cals: ICSCalendarConfig[] = await fetch('/api/life/ics-calendars').then(r => r.json())
    setIcsCalendars(cals)
    if (cals.length === 0) return
    setIcsLoading(true)
    const all: ICSEvent[] = []
    await Promise.all(cals.map(async cal => {
      try {
        const res = await fetch(`/api/life/ics?url=${encodeURIComponent(cal.url)}`)
        if (!res.ok) return
        const evs: ICSEvent[] = await res.json()
        for (const ev of evs) all.push({ ...ev, calendarColor: cal.color, calendarName: cal.name, calendarId: cal.id })
      } catch {}
    }))
    setIcsEvents(all)
    setIcsLoading(false)
  }, [])

  const loadShare = useCallback(async () => {
    const res = await fetch('/api/life/share')
    setShareToken(await res.json())
  }, [])

  useEffect(() => { loadData(); loadICS(); loadShare() }, [loadData, loadICS, loadShare])

  async function regenerateToken(type: 'busy' | 'public') {
    const res = await fetch('/api/life/share', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ type }) })
    const { token } = await res.json()
    setShareToken(prev => prev ? { ...prev, [type === 'busy' ? 'busyToken' : 'publicToken']: token } : prev)
  }

  function copyLink(type: 'busy' | 'public') {
    if (!shareToken || !origin) return
    const token = type === 'busy' ? shareToken.busyToken : shareToken.publicToken
    navigator.clipboard.writeText(`${origin}/share/${token}`)
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
  }

  async function saveDay(day: string) {
    await fetch(`/api/life/schedule/${day}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ _type:'day', label:dayLabel[day]??'', summary:daySummary[day]??'' }) })
  }

  async function handleSaveBlock(formData: BlockFormData) {
    const biweeklyRef = formData.frequency === 'biweekly' ? getISOWeekParity(selectedMonday) : null
    const payload = { ...formData, biweeklyRef }
    if (modal?.mode === 'edit') {
      await fetch(`/api/life/schedule/${modal.block.id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) })
    } else {
      await fetch('/api/life/schedule', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) })
    }
    setModal(null); await loadData()
  }

  async function handleDeleteBlock(block: ScheduleBlock) {
    await fetch(`/api/life/schedule/${block.id}`, { method:'DELETE' })
    setModal(null); await loadData()
  }

  function prevWeek() { setSelectedMonday(m => { const d = new Date(m); d.setDate(m.getDate() - 7); return d }) }
  function nextWeek() { setSelectedMonday(m => { const d = new Date(m); d.setDate(m.getDate() + 7); return d }) }
  function jumpToDate(dateStr: string) {
    if (!dateStr) return
    setSelectedMonday(getMondayOfWeek(new Date(dateStr + 'T12:00:00')))
  }

  const selectedDate = getDateForDayKey(activeDay, selectedMonday)
  const dayStart = new Date(selectedDate); dayStart.setHours(0,0,0,0)
  const dayEnd = new Date(selectedDate); dayEnd.setHours(23,59,59,999)
  const isCurrentWeek = toLocalDateStr(selectedMonday) === toLocalDateStr(getMondayOfWeek(new Date()))
  const todayKey = JS_DAY_TO_KEY[new Date().getDay()]

  function eventsForCalendar(calId: string | null): ICSEvent[] {
    return icsEvents.filter(ev => {
      const d = new Date(ev.start)
      return (calId === null || ev.calendarId === calId) && d >= dayStart && d <= dayEnd && !ev.allDay
    })
  }

  const weekParity = getISOWeekParity(selectedMonday)
  const blocks = (data?.blocks[activeDay] ?? []).filter(b => {
    if (b.frequency === 'biweekly' && b.biweeklyRef !== null) {
      return b.biweeklyRef === weekParity
    }
    return true
  })
  const totalHeight = minutesToPx(DAY_END) + 20
  const hasICS = icsCalendars.length > 0

  const hourLabelCol = (
    <div style={{ width:48,flexShrink:0,position:'relative',height:totalHeight }}>
      {HOURS.map(h => (
        <div key={h} style={{ position:'absolute',top:minutesToPx(h*60),right:8,fontSize:10,color:'#9CA3AF',fontWeight:500,lineHeight:1,transform:'translateY(-50%)',whiteSpace:'nowrap' }}>
          {h === 24 ? '00:00' : `${String(h).padStart(2,'0')}:00`}
        </div>
      ))}
    </div>
  )

  const gridLines = HOURS.map(h => (
    <div key={h} style={{ position:'absolute',top:minutesToPx(h*60),left:0,right:0,height:1,background:'#F3F4F6' }} />
  ))

  // The "Your Plan" blocks column
  const yourPlanCol = (
    <div style={{ width: isMobile ? '100%' : COL_WIDTH, flexShrink:0, position:'relative', height:totalHeight }}>
      {gridLines}
      {blocks.map(block => (
        <ScheduleBlock_ key={block.id} block={block} editMode={editMode}
          onEdit={b => setModal({ mode:'edit', block:b })}
          onDelete={b => handleDeleteBlock(b)} />
      ))}
    </div>
  )

  // Render ICS column content for a given calendar
  function renderICSCol(cal: ICSCalendarConfig) {
    const evs = eventsForCalendar(cal.id)
    return (
      <div key={cal.id} style={{ display:'flex', alignItems:'flex-start', flexShrink:0 }}>
        <div style={{ width:1, background:'#e5e7eb', margin:'0 12px', height:totalHeight, flexShrink:0 }} />
        <div style={{ width: isMobile ? '100%' : COL_WIDTH, flexShrink:0, position:'relative', height:totalHeight }}>
          {gridLines}
          {icsLoading ? (
            <div style={{ position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',color:'#9CA3AF',fontSize:12 }}>Loading…</div>
          ) : evs.length === 0 ? (
            <div style={{ position:'absolute',top:60,left:0,right:0,textAlign:'center',color:'#D1D5DB',fontSize:12 }}>No events</div>
          ) : (
            evs.map(ev => <ICSBlock key={ev.uid + ev.start} ev={ev} />)
          )}
        </div>
      </div>
    )
  }

  const activeMobileCal = mobileCalendarId ? icsCalendars.find(c => c.id === mobileCalendarId) : null

  return (
    <div style={{ minHeight:'100vh', background:'#F9FAFB', padding:'24px 0' }}>
      <div style={{ maxWidth: isMobile ? '100%' : 'none', margin:'0 auto', padding: isMobile ? '0 12px' : '0 24px' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, gap:8 }}>
          <h1 style={{ fontSize:22, fontWeight:700, color:'#111827' }}>Schedule</h1>
          <div style={{ display:'flex', gap:8 }}>
            {hasICS && (
              <button onClick={() => loadICS()} disabled={icsLoading}
                style={{ display:'flex',alignItems:'center',gap:5,padding:'7px 12px',borderRadius:10,border:'1.5px solid #e5e7eb',background:'#fff',color:'#374151',fontWeight:600,fontSize:12,cursor:'pointer',opacity:icsLoading?0.6:1 }}>
                <RefreshCw size={13} style={{ animation: icsLoading ? 'spin 1s linear infinite' : 'none' }} />
                {!isMobile && 'Refresh'}
              </button>
            )}
            <Link href="/life/contacts"
              style={{ display:'flex',alignItems:'center',gap:6,padding:'7px 12px',borderRadius:10,border:'1.5px solid #e5e7eb',background:'#fff',color:'#374151',fontWeight:600,fontSize:13,textDecoration:'none' }}
              title="People">
              <Users size={14} /> {!isMobile && 'People'}
            </Link>
            <Link href="/schedule/settings"
              style={{ display:'flex',alignItems:'center',gap:6,padding:'7px 12px',borderRadius:10,border:'1.5px solid #e5e7eb',background:'#fff',color:'#374151',fontWeight:600,fontSize:13,textDecoration:'none' }}
              title="Calendar settings">
              <Settings size={14} /> {!isMobile && 'Calendars'}
            </Link>
            <button onClick={() => setShowSharePanel(v => !v)}
              style={{ display:'flex',alignItems:'center',gap:6,padding:'7px 12px',borderRadius:10,border:showSharePanel?'1.5px solid #6366f1':'1.5px solid #e5e7eb',background:showSharePanel?'#EEF2FF':'#fff',color:showSharePanel?'#4F46E5':'#374151',fontWeight:600,fontSize:13,cursor:'pointer' }}>
              <Share2 size={14} /> {!isMobile && 'Share'}
            </button>
            <button onClick={() => setEditMode(v => !v)}
              style={{ display:'flex',alignItems:'center',gap:6,padding:'7px 14px',borderRadius:10,border:editMode?'1.5px solid #6366f1':'1.5px solid #e5e7eb',background:editMode?'#EEF2FF':'#fff',color:editMode?'#4F46E5':'#374151',fontWeight:600,fontSize:13,cursor:'pointer' }}>
              <Pencil size={14} /> {editMode ? 'Done' : 'Edit'}
            </button>
          </div>
        </div>

        {/* Share panel */}
        {showSharePanel && shareToken && (
          <div style={{ background:'#fff',border:'1px solid #e5e7eb',borderRadius:14,padding:'16px',marginBottom:20,display:'flex',flexDirection:'column',gap:14 }}>
            <p style={{ fontSize:13,fontWeight:700,color:'#111827',margin:0 }}>Share your calendar</p>

            {/* Busy link */}
            <div style={{ background:'#F9FAFB',border:'1px solid #e5e7eb',borderRadius:12,padding:'12px 14px' }}>
              <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6 }}>
                <div>
                  <p style={{ fontSize:12,fontWeight:700,color:'#374151',margin:0 }}>Busy link</p>
                  <p style={{ fontSize:11,color:'#9CA3AF',margin:0 }}>Shows only &ldquo;Busy&rdquo; — no event titles or details</p>
                </div>
                <button onClick={() => copyLink('busy')}
                  style={{ display:'flex',alignItems:'center',gap:5,padding:'6px 12px',borderRadius:8,border:copied==='busy'?'1.5px solid #10b981':'1.5px solid #6366f1',background:copied==='busy'?'#ECFDF5':'#EEF2FF',color:copied==='busy'?'#059669':'#4F46E5',fontWeight:600,fontSize:12,cursor:'pointer',flexShrink:0 }}>
                  {copied === 'busy' ? <><Check size={12} /> Copied</> : <><Share2 size={12} /> Copy</>}
                </button>
              </div>
              <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                <div style={{ flex:1,fontSize:11,color:'#9CA3AF',overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis' }}>
                  {origin ? `${origin}/share/${shareToken.busyToken}` : `…/${shareToken.busyToken}`}
                </div>
                <button onClick={() => regenerateToken('busy')} style={{ fontSize:11,color:'#9CA3AF',background:'none',border:'none',cursor:'pointer',padding:0,whiteSpace:'nowrap',textDecoration:'underline',flexShrink:0 }}>
                  Regenerate
                </button>
              </div>
            </div>

            {/* Public link */}
            <div style={{ background:'#F9FAFB',border:'1px solid #e5e7eb',borderRadius:12,padding:'12px 14px' }}>
              <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6 }}>
                <div>
                  <p style={{ fontSize:12,fontWeight:700,color:'#374151',margin:0 }}>Public link</p>
                  <p style={{ fontSize:11,color:'#9CA3AF',margin:0 }}>Shows full event titles and calendar</p>
                </div>
                <button onClick={() => copyLink('public')}
                  style={{ display:'flex',alignItems:'center',gap:5,padding:'6px 12px',borderRadius:8,border:copied==='public'?'1.5px solid #10b981':'1.5px solid #6366f1',background:copied==='public'?'#ECFDF5':'#EEF2FF',color:copied==='public'?'#059669':'#4F46E5',fontWeight:600,fontSize:12,cursor:'pointer',flexShrink:0 }}>
                  {copied === 'public' ? <><Check size={12} /> Copied</> : <><Share2 size={12} /> Copy</>}
                </button>
              </div>
              <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                <div style={{ flex:1,fontSize:11,color:'#9CA3AF',overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis' }}>
                  {origin ? `${origin}/share/${shareToken.publicToken}` : `…/${shareToken.publicToken}`}
                </div>
                <button onClick={() => regenerateToken('public')} style={{ fontSize:11,color:'#9CA3AF',background:'none',border:'none',cursor:'pointer',padding:0,whiteSpace:'nowrap',textDecoration:'underline',flexShrink:0 }}>
                  Regenerate
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Week navigation */}
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
          <button onClick={prevWeek}
            style={{ display:'flex',alignItems:'center',justifyContent:'center',padding:'7px 10px',borderRadius:10,border:'1.5px solid #e5e7eb',background:'#fff',cursor:'pointer',flexShrink:0 }}>
            <ChevronLeft size={16} color="#374151" />
          </button>
          <div style={{ display:'flex',alignItems:'center',gap:8,flex:1,justifyContent:'center',minWidth:0 }}>
            <span style={{ fontSize:14,fontWeight:600,color:'#111827',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>{weekRangeLabel(selectedMonday)}</span>
            {!isCurrentWeek && (
              <button onClick={() => setSelectedMonday(getMondayOfWeek(new Date()))}
                style={{ fontSize:11,fontWeight:600,color:'#6366f1',background:'#EEF2FF',border:'none',borderRadius:99,padding:'2px 8px',cursor:'pointer',flexShrink:0 }}>
                Today
              </button>
            )}
          </div>
          <label style={{ display:'flex',alignItems:'center',justifyContent:'center',padding:'7px 10px',borderRadius:10,border:'1.5px solid #e5e7eb',background:'#fff',cursor:'pointer',flexShrink:0,position:'relative' }}>
            <Calendar size={14} color="#374151" />
            <input type="date" style={{ position:'absolute',opacity:0,width:'100%',height:'100%',top:0,left:0,cursor:'pointer' }}
              onChange={e => jumpToDate(e.target.value)} />
          </label>
          <button onClick={nextWeek}
            style={{ display:'flex',alignItems:'center',justifyContent:'center',padding:'7px 10px',borderRadius:10,border:'1.5px solid #e5e7eb',background:'#fff',cursor:'pointer',flexShrink:0 }}>
            <ChevronRight size={16} color="#374151" />
          </button>
        </div>

        {/* Day tabs */}
        <div style={{ display:'flex', gap:6, marginBottom:16, overflowX:'auto', WebkitOverflowScrolling:'touch' } as React.CSSProperties}>
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

        {/* Mobile calendar picker tabs */}
        {isMobile && hasICS && (
          <div style={{ display:'flex', gap:6, marginBottom:12, overflowX:'auto', WebkitOverflowScrolling:'touch' } as React.CSSProperties}>
            <button onClick={() => setMobileCalendarId(null)}
              style={{ padding:'5px 14px',borderRadius:99,border:mobileCalendarId===null?'1.5px solid #374151':'1.5px solid #e5e7eb',background:mobileCalendarId===null?'#111827':'#fff',color:mobileCalendarId===null?'#fff':'#374151',fontWeight:600,fontSize:12,cursor:'pointer',flexShrink:0,whiteSpace:'nowrap' }}>
              Your Plan
            </button>
            {icsCalendars.map(cal => (
              <button key={cal.id} onClick={() => setMobileCalendarId(cal.id)}
                style={{ padding:'5px 14px',borderRadius:99,border:mobileCalendarId===cal.id?`1.5px solid ${cal.color}`:'1.5px solid #e5e7eb',background:mobileCalendarId===cal.id?cal.color:'#fff',color:mobileCalendarId===cal.id?'#fff':'#374151',fontWeight:600,fontSize:12,cursor:'pointer',flexShrink:0,whiteSpace:'nowrap' }}>
                {cal.name}
              </button>
            ))}
          </div>
        )}

        {/* Legend */}
        <div style={{ display:'flex', flexWrap:'wrap', gap:'6px 14px', marginBottom:14 }}>
          {(!isMobile || mobileCalendarId === null) && Object.entries(CATEGORY_COLORS).map(([cat, colors]) => (
            <div key={cat} style={{ display:'flex', alignItems:'center', gap:5 }}>
              <span style={{ width:9,height:9,borderRadius:'50%',background:colors.dot,display:'inline-block' }} />
              <span style={{ fontSize:11,color:'#6B7280',fontWeight:500 }}>{CATEGORY_LABELS[cat]}</span>
            </div>
          ))}
          {(!isMobile && hasICS) && icsCalendars.map(cal => (
            <div key={cal.id} style={{ display:'flex', alignItems:'center', gap:5 }}>
              <span style={{ width:9,height:9,borderRadius:'50%',background:cal.color,display:'inline-block' }} />
              <span style={{ fontSize:11,color:'#6B7280',fontWeight:500 }}>{cal.name}</span>
            </div>
          ))}
          {(isMobile && activeMobileCal) && (
            <div style={{ display:'flex', alignItems:'center', gap:5 }}>
              <span style={{ width:9,height:9,borderRadius:'50%',background:activeMobileCal.color,display:'inline-block' }} />
              <span style={{ fontSize:11,color:'#6B7280',fontWeight:500 }}>{activeMobileCal.name}</span>
            </div>
          )}
        </div>

        {/* Day summary */}
        <div style={{ background:'#fff',border:'1px solid #e5e7eb',borderRadius:12,padding:'14px 16px',marginBottom:20 }}>
          {editMode ? (
            <>
              <input value={dayLabel[activeDay]??''} onChange={e => setDayLabel(p => ({...p,[activeDay]:e.target.value}))} onBlur={() => saveDay(activeDay)} placeholder="Day label (e.g. Monday — PT day.)" style={{ width:'100%',fontSize:14,fontWeight:700,color:'#111827',border:'none',outline:'none',background:'transparent',marginBottom:6,borderBottom:'1.5px dashed #d1d5db',paddingBottom:4 }} />
              <textarea value={daySummary[activeDay]??''} onChange={e => setDaySummary(p => ({...p,[activeDay]:e.target.value}))} onBlur={() => saveDay(activeDay)} placeholder="Day summary..." rows={3} style={{ width:'100%',fontSize:12,color:'#6B7280',border:'none',outline:'none',background:'transparent',resize:'none',fontFamily:'inherit',lineHeight:1.5 }} />
            </>
          ) : (
            <>
              <p style={{ fontSize:14,fontWeight:700,color:'#111827',marginBottom:4 }}>{dayLabel[activeDay] || DAYS.find(d => d.key === activeDay)?.full}</p>
              <p style={{ fontSize:12,color:'#6B7280',lineHeight:1.55 }}>{daySummary[activeDay] || 'No summary.'}</p>
            </>
          )}
        </div>

        {/* Timeline */}
        <div style={{ background:'#fff',border:'1px solid #e5e7eb',borderRadius:14,padding:'16px 16px 16px 0',position:'relative',overflowX: isMobile ? 'hidden' : 'auto' }}>

          {/* Desktop column headers */}
          {!isMobile && hasICS && (
            <div style={{ display:'flex', paddingLeft:48, marginBottom:8, paddingRight:8, minWidth:`${48 + COL_WIDTH + icsCalendars.length * (COL_WIDTH + 25)}px` }}>
              <div style={{ width:COL_WIDTH, flexShrink:0, fontSize:11, fontWeight:700, color:'#374151', textTransform:'uppercase', letterSpacing:'0.05em' }}>Your plan</div>
              {icsCalendars.map(cal => (
                <div key={cal.id} style={{ display:'flex', alignItems:'center' }}>
                  <div style={{ width:1, background:'#e5e7eb', margin:'0 12px', height:18, flexShrink:0 }} />
                  <div style={{ width:COL_WIDTH, flexShrink:0, fontSize:11, fontWeight:700, letterSpacing:'0.05em', display:'flex', alignItems:'center', gap:6, color:cal.color, textTransform:'uppercase' }}>
                    {cal.name}
                    {eventsForCalendar(cal.id).length > 0 && (
                      <span style={{ fontSize:10,background:cal.color+'18',color:cal.color,borderRadius:99,padding:'1px 7px',fontWeight:600 }}>
                        {eventsForCalendar(cal.id).length}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display:'flex', minWidth: isMobile ? 'auto' : `${48 + COL_WIDTH + icsCalendars.length * (COL_WIDTH + 25)}px` }}>
            {hourLabelCol}

            {isMobile ? (
              // Mobile: single column, either Your Plan or selected ICS calendar
              mobileCalendarId === null ? (
                yourPlanCol
              ) : activeMobileCal ? (
                <div style={{ flex:1, position:'relative', height:totalHeight }}>
                  {gridLines}
                  {icsLoading ? (
                    <div style={{ position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',color:'#9CA3AF',fontSize:12 }}>Loading…</div>
                  ) : eventsForCalendar(activeMobileCal.id).length === 0 ? (
                    <div style={{ position:'absolute',top:60,left:0,right:0,textAlign:'center',color:'#D1D5DB',fontSize:12 }}>No events</div>
                  ) : (
                    eventsForCalendar(activeMobileCal.id).map(ev => <ICSBlock key={ev.uid + ev.start} ev={ev} />)
                  )}
                </div>
              ) : null
            ) : (
              // Desktop: Your Plan + all ICS calendars side by side
              <>
                {yourPlanCol}
                {hasICS && icsCalendars.map(cal => renderICSCol(cal))}
              </>
            )}
          </div>

          {editMode && (!isMobile || mobileCalendarId === null) && (
            <div style={{ marginTop:16, paddingLeft:48 }}>
              <button onClick={() => setModal({ mode:'add' })}
                style={{ display:'flex',alignItems:'center',gap:6,padding:'8px 16px',borderRadius:10,border:'1.5px dashed #6366f1',background:'#EEF2FF',color:'#4F46E5',fontWeight:600,fontSize:13,cursor:'pointer' }}>
                <Plus size={14} /> Add block
              </button>
            </div>
          )}
        </div>
      </div>

      {modal && (
        <BlockModal
          currentDay={activeDay}
          initial={modal.mode === 'edit' ? {
            id:        modal.block.id,
            startTime: modal.block.startTime,
            endTime:   modal.block.endTime ?? '',
            name:      modal.block.name,
            note:      modal.block.note ?? '',
            category:  modal.block.category,
            sacred:    modal.block.sacred,
            day:       modal.block.day,
            frequency: (modal.block.frequency as 'weekly' | 'biweekly') ?? 'weekly',
          } : undefined}
          onSave={handleSaveBlock}
          onDelete={modal.mode === 'edit' ? () => handleDeleteBlock(modal.block) : undefined}
          onCancel={() => setModal(null)}
        />
      )}
    </div>
  )
}
