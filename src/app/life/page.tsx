'use client'
import { useEffect, useState, useCallback } from 'react'
import { HabitCard } from '@/components/habits/HabitCard'
import { ReentryModal } from '@/components/habits/ReentryModal'
import { calcStreak, startOfDay } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight, Pencil, Plane, Heart, Cake, Flame, Sun, SunMedium, Moon, Clock, PartyPopper, Sparkles, TreePalm } from 'lucide-react'
import Link from 'next/link'
import { TrendBars, Delta } from '@/components/ui/synth'
import { Card, Label } from '@/components/ledger/primitives'
import { toast } from 'sonner'

interface Contact {
  id: string; name: string; emoji?: string | null; birthday?: string | null
  reachOutFrequency: string; lastContactDate?: string | null
}

const FREQ_DAYS: Record<string, number> = { weekly: 7, monthly: 30, quarterly: 90, yearly: 365 }

function getContactAlerts(contacts: Contact[], today: Date): { birthdays: Contact[]; overdue: Contact[] } {
  const mm = String(today.getMonth() + 1).padStart(2, '0')
  const dd = String(today.getDate()).padStart(2, '0')
  const nextWeek = new Date(today); nextWeek.setDate(today.getDate() + 7)
  const nwMm = String(nextWeek.getMonth() + 1).padStart(2, '0')
  const nwDd = String(nextWeek.getDate()).padStart(2, '0')

  const birthdays = contacts.filter(c => {
    if (!c.birthday) return false
    const [bm, bd] = c.birthday.split('-')
    const bKey = `${bm}-${bd}`
    return bKey >= `${mm}-${dd}` && bKey <= `${nwMm}-${nwDd}`
  })

  const overdue = contacts.filter(c => {
    const days = FREQ_DAYS[c.reachOutFrequency] ?? 30
    if (!c.lastContactDate) return true
    const last = new Date(c.lastContactDate)
    return (today.getTime() - last.getTime()) / 86400000 > days
  })

  return { birthdays, overdue: overdue.slice(0, 3) }
}

interface SubTask { id: string; name: string; order: number }
interface Habit {
  id: string; name: string; category: string; type: string
  icon?: string | null; color?: string | null; unit?: string | null; target?: number | null
  frequency: string; frequencyDays: number[]; timeOfDay: string; createdAt: string
  subTasks: SubTask[]
}
interface HabitLog {
  id?: string; completed: boolean; value?: number | null; date?: string
  completedSubTaskIds?: string[]
}
interface TodayItem { habit: Habit; log: HabitLog | null; isScheduled: boolean }

const TIME_BLOCKS = [
  { key: 'morning', label: 'Morning', icon: Sun },
  { key: 'noon',    label: 'Noon',    icon: SunMedium },
  { key: 'night',   label: 'Night',   icon: Moon },
  { key: 'all_day', label: 'All Day', icon: Clock },
]
const FILTER_TABS = [
  { key: 'all',     label: 'All'     },
  { key: 'morning', label: 'Morning' },
  { key: 'noon',    label: 'Noon'    },
  { key: 'night',   label: 'Night'   },
  { key: 'all_day', label: 'All Day' },
]
const DAY_ABBR = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']

function mondayOf(date: Date): Date {
  const d = startOfDay(new Date(date))
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  return d
}

function weekDays(monday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(d.getDate() + i)
    return d
  })
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

/** Produces YYYY-MM-DD in the user's LOCAL timezone — never UTC-shifted */
function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

interface WeekScore { score: number; completed: number; total: number }
interface ScoreData { thisWeek: WeekScore; lastWeek: WeekScore; delta: number; direction: 'up' | 'down' | 'same' }
interface DayScore { date: string; score: number; completed: number; total: number }
interface DayScores { days: DayScore[]; bestStreak: { name: string; icon: string | null; count: number } }

export default function TodayPage() {
  const [items, setItems] = useState<TodayItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()))
  const [weekStart, setWeekStart] = useState<Date>(() => mondayOf(new Date()))
  const [filterTime, setFilterTime] = useState('all')
  const [name, setName] = useState('')
  const [weekScore, setWeekScore] = useState<ScoreData | null>(null)
  const [dayScores, setDayScores] = useState<DayScores | null>(null)
  const [showReentry, setShowReentry] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [holidays, setHolidays] = useState<Set<string>>(new Set())
  const [contacts, setContacts] = useState<Contact[]>([])

  const today = startOfDay(new Date())
  const isToday = isSameDay(selectedDate, today)
  const days = weekDays(weekStart)
  const selectedKey = toLocalDateStr(selectedDate)
  const isHoliday = holidays.has(selectedKey)

  function toggleHoliday() {
    const next = new Set(holidays)
    if (isHoliday) next.delete(selectedKey)
    else next.add(selectedKey)
    setHolidays(next)
    localStorage.setItem('holidays', JSON.stringify(Array.from(next)))
  }

  const loadScores = useCallback(() => {
    fetch('/api/life/weekly-score').then(r => r.json()).then(setWeekScore).catch(() => {})
    fetch('/api/life/day-scores?days=14').then(r => r.json()).then(setDayScores).catch(() => {})
  }, [])

  useEffect(() => {
    const saved = localStorage.getItem('userName')
    if (saved) setName(saved)
    loadScores()
    fetch('/api/life/contacts').then(r => r.json()).then(setContacts).catch(() => {})
    try {
      const h = JSON.parse(localStorage.getItem('holidays') ?? '[]')
      setHolidays(new Set(h))
    } catch { /* ignore */ }
  }, [loadScores])

  function saveName() {
    const n = nameInput.trim()
    if (n) { setName(n); localStorage.setItem('userName', n) }
    setEditingName(false)
  }

  const load = useCallback(async (date: Date) => {
    setLoading(true)
    const res = await fetch(`/api/life/today?date=${toLocalDateStr(date)}`)
    setItems(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load(selectedDate) }, [load, selectedDate])

  const dailyItems = items.filter(i => i.habit.category !== 'Weekly Check-in')
  const totalDone = dailyItems.filter(i => i.log?.completed).length
  const total = dailyItems.length
  const pct = total > 0 ? Math.round((totalDone / total) * 100) : 0

  async function postLog(body: Record<string, unknown>) {
    try {
      const res = await fetch('/api/life/logs', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(await res.text())
      return true
    } catch (err) {
      console.error('[habits] save failed', err)
      toast.error("Couldn't save — check the connection and try again")
      return false
    }
  }

  async function handleToggle(item: TodayItem, completed: boolean) {
    setItems(prev => prev.map(i => i.habit.id === item.habit.id ? { ...i, log: { ...(i.log ?? {}), completed } } : i))
    const ok = await postLog({ habitId: item.habit.id, date: toLocalDateStr(selectedDate) + 'T12:00:00.000Z', completed, value: item.log?.value ?? null })
    if (!ok) setItems(prev => prev.map(i => i.habit.id === item.habit.id ? { ...i, log: { ...(i.log ?? {}), completed: !completed } } : i))
    loadScores()
  }

  async function handleQuantity(item: TodayItem, value: number) {
    const completed = item.habit.target != null && value >= item.habit.target
    setItems(prev => prev.map(i => i.habit.id === item.habit.id ? { ...i, log: { ...(i.log ?? {}), value, completed } } : i))
    const ok = await postLog({ habitId: item.habit.id, date: toLocalDateStr(selectedDate) + 'T12:00:00.000Z', completed, value })
    if (!ok) load(selectedDate)
    loadScores()
  }

  async function handleSubTask(item: TodayItem, subTaskId: string, checked: boolean) {
    const prev = item.log?.completedSubTaskIds ?? []
    const completedSubTaskIds = checked ? [...prev.filter(id => id !== subTaskId), subTaskId] : prev.filter(id => id !== subTaskId)
    const allDone = item.habit.subTasks.length > 0 && completedSubTaskIds.length >= item.habit.subTasks.length
    const completed = allDone || (item.log?.completed ?? false)
    setItems(p => p.map(i => i.habit.id === item.habit.id ? { ...i, log: { ...(i.log ?? {}), completed, completedSubTaskIds } } : i))
    const ok = await postLog({ habitId: item.habit.id, date: toLocalDateStr(selectedDate) + 'T12:00:00.000Z', completed, value: item.log?.value ?? null, completedSubTaskIds })
    if (!ok) load(selectedDate)
    loadScores()
  }

  const pending = dailyItems.filter(i => {
    if (i.log?.completed) return false
    return filterTime === 'all' || (i.habit.timeOfDay ?? 'all_day') === filterTime
  })
  const done = dailyItems.filter(i => i.log?.completed)

  const pendingGrouped = TIME_BLOCKS.map(b => ({ ...b, items: pending.filter(i => (i.habit.timeOfDay ?? 'all_day') === b.key) })).filter(g => g.items.length > 0)

  function renderHabit(item: TodayItem) {
    const habitWithLogs = { ...item.habit, createdAt: new Date(item.habit.createdAt),
      logs: item.log ? [{ date: item.log.date ?? selectedDate.toISOString(), completed: item.log.completed }] : [] }
    return (
      <HabitCard key={item.habit.id} habit={item.habit} log={item.log} streak={calcStreak(habitWithLogs)}
        onToggle={completed => handleToggle(item, completed)}
        onQuantityUpdate={value => handleQuantity(item, value)}
        onSubTask={(id, checked) => handleSubTask(item, id, checked)} />
    )
  }

  function selectDay(dateStr: string) {
    const d = startOfDay(new Date(dateStr + 'T12:00:00'))
    if (d > today) return
    setSelectedDate(d)
    setWeekStart(mondayOf(d))
  }

  const { birthdays, overdue } = getContactAlerts(contacts, today)
  const streak = dayScores?.bestStreak

  return (
    <div className="max-w-5xl mx-auto space-y-4 pb-6">
      {/* ── Hero: the day, synthesized ── */}
      <Card className="p-5">
        {/* Top row: identity + day controls */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <Label>{selectedDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</Label>
            {editingName ? (
              <input autoFocus className="text-[17px] font-semibold bg-ldg-paper rounded-lg px-2 py-0.5 mt-0.5 text-ldg-ink outline-none w-40"
                value={nameInput} onChange={e => setNameInput(e.target.value)}
                onBlur={saveName} onKeyDown={e => e.key === 'Enter' && saveName()} placeholder="Your name" />
            ) : (
              <button onClick={() => { setNameInput(name); setEditingName(true) }} className="flex items-center gap-1.5 group mt-0.5">
                <h1 className="text-[17px] font-semibold text-ldg-ink">{name ? `${greeting()}, ${name}` : greeting()}</h1>
                <Pencil size={11} className="text-ldg-ink/25 group-hover:text-ldg-ink/60 transition-colors" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <button onClick={toggleHoliday}
              className={cn('p-1.5 px-2.5 rounded-lg border transition-colors',
                isHoliday ? 'bg-ldg-green/10 text-ldg-green border-ldg-green/30' : 'border-ldg-ink/10 text-ldg-ink/55 hover:bg-ldg-ink/[0.04]')}>
              <TreePalm size={13} />
            </button>
            <button onClick={() => setShowReentry(true)}
              className="p-1.5 px-2.5 rounded-lg border border-ldg-ink/10 text-ldg-ink/55 hover:bg-ldg-ink/[0.04] transition-colors" title="Just got back?">
              <Plane size={13} />
            </button>
          </div>
        </div>

        {/* Score row: figures per §2, no ring gimmick */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-ldg-ink/55">Today</p>
            <p className="font-mono text-[26px] tabular-nums tracking-tight leading-none mt-1">{pct}%</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-ldg-ink/55">Week</p>
            <p className="font-mono text-[26px] tabular-nums tracking-tight leading-none mt-1 flex items-baseline gap-1.5">
              {weekScore ? `${weekScore.thisWeek.score}%` : '—'}
              {weekScore && <Delta value={weekScore.delta} />}
            </p>
            {weekScore && <p className="font-mono text-[11px] text-ldg-ink/55 mt-0.5">{weekScore.thisWeek.completed}/{weekScore.thisWeek.total} this week</p>}
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-ldg-ink/55">Done</p>
            <p className="font-mono text-[26px] tabular-nums tracking-tight leading-none mt-1">{totalDone}/{total}</p>
            {isToday && <p className="font-mono text-[11px] text-ldg-ink/55 mt-0.5">so far today</p>}
          </div>
        </div>

        {streak && streak.count > 0 && (
          <p className="font-mono text-[12px] text-ldg-ink/55 mt-3 flex items-center gap-1.5">
            <Flame size={13} className="text-ldg-green" /> best streak — {streak.count} days · {streak.name}
          </p>
        )}

        {/* 14-day trend — tap a bar to jump to that day */}
        {dayScores && dayScores.days.length > 0 && (
          <div className="mt-5 pt-4 border-t border-ldg-ink/[0.07]">
            <div className="flex items-center justify-between mb-1.5">
              <Label>Last 14 days</Label>
              <p className="font-mono text-[11px] text-ldg-ink/55">
                avg {Math.round(dayScores.days.reduce((s, d) => s + d.score, 0) / dayScores.days.length)}%
              </p>
            </div>
            <TrendBars days={dayScores.days} selected={selectedKey} onSelect={selectDay} height={40} />
          </div>
        )}

        {/* Week strip */}
        <div className="relative mt-5 pt-4 border-t border-ldg-ink/[0.07] flex items-center justify-between">
          <button onClick={() => setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n })}
            className="p-1.5 rounded-full hover:bg-ldg-ink/[0.05] transition-colors text-ldg-ink/55">
            <ChevronLeft size={16} />
          </button>
          <div className="flex gap-1 flex-1 justify-center">
            {days.map(day => {
              const isT = isSameDay(day, today)
              const sel = isSameDay(day, selectedDate)
              const future = day > today
              return (
                <button key={day.toISOString()} onClick={() => !future && setSelectedDate(startOfDay(new Date(day)))}
                  className={cn('flex flex-col items-center gap-0.5 rounded-lg transition-all px-1.5 py-2 min-w-[38px]',
                    sel ? 'bg-ldg-green/10 border border-ldg-green/30' : future ? 'opacity-30 cursor-default' : 'hover:bg-ldg-ink/[0.05]')}>
                  <span className={cn('text-[9px] font-bold tracking-wider',
                    sel ? 'text-ldg-green' : isT ? 'text-ldg-ink' : 'text-ldg-ink/40')}>
                    {isT ? 'TDY' : DAY_ABBR[day.getDay()]}
                  </span>
                  <span className={cn('text-sm font-bold', sel ? 'text-ldg-green' : 'text-ldg-ink')}>
                    {day.getDate()}
                  </span>
                </button>
              )
            })}
          </div>
          <button onClick={() => setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n })}
            className="p-1.5 rounded-full hover:bg-ldg-ink/[0.05] transition-colors text-ldg-ink/55">
            <ChevronRight size={16} />
          </button>
        </div>
      </Card>

      {/* ── Filter tabs ── */}
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {FILTER_TABS.map(tab => (
          <button key={tab.key} onClick={() => setFilterTime(tab.key)}
            className={cn('shrink-0 text-[13px] px-3 py-1.5 rounded-lg border whitespace-nowrap transition-colors',
              filterTime === tab.key ? 'font-semibold bg-ldg-green/10 text-ldg-green border-ldg-green/30' : 'font-medium text-ldg-ink/55 border-ldg-ink/10')}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Contact alerts ── */}
      {(birthdays.length > 0 || overdue.length > 0) && (
        <div className="space-y-2">
          {birthdays.map(c => {
            const [bm, bd] = (c.birthday ?? '').split('-')
            const isTodayBday = bm === String(today.getMonth() + 1).padStart(2, '0') && bd === String(today.getDate()).padStart(2, '0')
            return (
              <Link key={c.id} href="/people">
                <Card className="flex items-center gap-3 px-4 py-3">
                  <span className="text-xl">{c.emoji ?? '👤'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium text-ldg-ink truncate">
                      {isTodayBday ? `It's ${c.name}'s birthday today!` : `${c.name}'s birthday is coming up`}
                    </p>
                    <p className="font-mono text-[11px] text-ldg-ink/55">{isTodayBday ? 'Don\'t forget to send wishes' : 'Within the next 7 days'}</p>
                  </div>
                  <Cake size={16} className="text-ldg-ink/55 shrink-0" />
                </Card>
              </Link>
            )
          })}

          {overdue.map(c => {
            const daysFreq = FREQ_DAYS[c.reachOutFrequency] ?? 30
            const daysSince = c.lastContactDate
              ? Math.floor((today.getTime() - new Date(c.lastContactDate).getTime()) / 86400000)
              : null
            return (
              <Link key={c.id} href="/people">
                <Card className="flex items-center gap-3 px-4 py-3">
                  <span className="text-xl">{c.emoji ?? '👤'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium text-ldg-ink truncate">
                      Reach out to {c.name}
                    </p>
                    <p className="font-mono text-[11px] text-ldg-ink/55">
                      {daysSince != null ? `Last contact ${daysSince}d ago · every ${daysFreq}d` : 'Never contacted'}
                    </p>
                  </div>
                  <Heart size={16} className="text-ldg-ink/55 shrink-0" />
                </Card>
              </Link>
            )
          })}
        </div>
      )}

      {/* ── Habit list ── */}
      <div>
        {isHoliday ? (
          <div className="text-center py-20">
            <TreePalm size={40} className="mx-auto mb-4 text-ldg-ink/25" />
            <p className="font-bold text-lg text-ldg-ink">On holiday</p>
            <p className="text-sm text-ldg-ink/55 mt-1">Habits are paused. Enjoy the break.</p>
            <button onClick={toggleHoliday} className="mt-4 font-mono text-[12px] text-ldg-ink/55 underline underline-offset-2">Remove holiday</button>
          </div>
        ) : loading ? (
          <div className="space-y-2">
            {[1,2,3,4].map(i => <div key={i} className="h-16 bg-ldg-ink/[0.05] rounded-2xl animate-pulse" />)}
          </div>
        ) : total === 0 ? (
          <div className="text-center py-20">
            <Sparkles size={40} className="mx-auto mb-4 text-ldg-ink/25" />
            <p className="font-bold text-lg text-ldg-ink">Looking Ahead</p>
            <p className="text-sm text-ldg-ink/55 mt-1">No habits yet. Add some below.</p>
          </div>
        ) : (
          <>
            {filterTime === 'all' ? (
              pendingGrouped.map(group => (
                <div key={group.key} className={group.key === pendingGrouped[0].key ? '' : 'mt-4'}>
                  <div className="flex items-center justify-between mb-2 px-1">
                    <div className="flex items-center gap-1.5">
                      <group.icon size={12} className="text-ldg-ink/55" />
                      <Label>{group.label}</Label>
                    </div>
                    <p className="font-mono text-[11px] text-ldg-ink/55">{group.items.length} left</p>
                  </div>
                  <Card className="overflow-hidden divide-y divide-ldg-ink/[0.07]">
                    {group.items.map(renderHabit)}
                  </Card>
                </div>
              ))
            ) : pending.length > 0 ? (
              <Card className="overflow-hidden divide-y divide-ldg-ink/[0.07]">
                {pending.map(renderHabit)}
              </Card>
            ) : (
              <p className="text-center font-mono text-[12px] text-ldg-ink/55 mt-10">nothing in this slot</p>
            )}

            {pending.length === 0 && filterTime === 'all' && done.length > 0 && (
              <div className="text-center pt-10 pb-2">
                <PartyPopper size={36} className="mx-auto mb-3 text-ldg-green" />
                <p className="font-bold text-ldg-ink">All done for the day</p>
                <p className="text-sm text-ldg-ink/55 mt-1">Every habit completed. Go live your life.</p>
              </div>
            )}

            {done.length > 0 && (
              <div className="mt-6">
                <Label className="mb-2 px-1">Completed</Label>
                <Card className="overflow-hidden divide-y divide-ldg-ink/[0.07] opacity-60">
                  {done.map(renderHabit)}
                </Card>
              </div>
            )}
          </>
        )}
      </div>
      {showReentry && <ReentryModal onClose={() => setShowReentry(false)} />}
    </div>
  )
}
