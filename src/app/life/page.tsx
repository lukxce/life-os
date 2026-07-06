'use client'
import { useEffect, useState, useCallback } from 'react'
import { HabitCard } from '@/components/habits/HabitCard'
import { ReentryModal } from '@/components/habits/ReentryModal'
import { calcStreak, startOfDay } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight, Pencil, Plane, Heart, Cake } from 'lucide-react'
import Link from 'next/link'
import { ScoreRing, TrendBars, Delta, HeroStat } from '@/components/ui/synth'

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
  { key: 'morning', label: '🌅 Morning' },
  { key: 'noon',    label: '☀️ Noon'    },
  { key: 'night',   label: '🌙 Night'   },
  { key: 'all_day', label: '🕐 All Day' },
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

  async function handleToggle(item: TodayItem, completed: boolean) {
    setItems(prev => prev.map(i => i.habit.id === item.habit.id ? { ...i, log: { ...(i.log ?? {}), completed } } : i))
    await fetch('/api/life/logs', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ habitId: item.habit.id, date: selectedDate.toISOString(), completed, value: item.log?.value ?? null }) })
    loadScores()
  }

  async function handleQuantity(item: TodayItem, value: number) {
    const completed = item.habit.target != null && value >= item.habit.target
    setItems(prev => prev.map(i => i.habit.id === item.habit.id ? { ...i, log: { ...(i.log ?? {}), value, completed } } : i))
    await fetch('/api/life/logs', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ habitId: item.habit.id, date: selectedDate.toISOString(), completed, value }) })
    loadScores()
  }

  async function handleSubTask(item: TodayItem, subTaskId: string, checked: boolean) {
    const prev = item.log?.completedSubTaskIds ?? []
    const completedSubTaskIds = checked ? [...prev.filter(id => id !== subTaskId), subTaskId] : prev.filter(id => id !== subTaskId)
    const allDone = item.habit.subTasks.length > 0 && completedSubTaskIds.length >= item.habit.subTasks.length
    const completed = allDone || (item.log?.completed ?? false)
    setItems(p => p.map(i => i.habit.id === item.habit.id ? { ...i, log: { ...(i.log ?? {}), completed, completedSubTaskIds } } : i))
    await fetch('/api/life/logs', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ habitId: item.habit.id, date: selectedDate.toISOString(), completed, value: item.log?.value ?? null, completedSubTaskIds }) })
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
    <div className="-mx-4 -mt-6 md:-mx-6 md:-mt-8">
      {/* ── Hero: the day, synthesized ── */}
      <div className="relative overflow-hidden rounded-b-[2rem] bg-[#0e0f15] text-white px-5 pt-8 pb-5">
        {/* aurora */}
        <div aria-hidden className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(640px 420px at 85% -20%, rgba(99,102,241,0.35), transparent 65%), radial-gradient(500px 380px at -10% 110%, rgba(139,92,246,0.18), transparent 60%)' }} />

        <div className="relative">
          {/* Top row: identity + day controls */}
          <div className="flex items-start justify-between mb-5">
            <div>
              <p className="text-[10px] font-bold tracking-[0.2em] text-white/40 uppercase">
                {selectedDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
              {editingName ? (
                <input autoFocus className="text-xl font-bold bg-white/10 rounded-lg px-2 py-0.5 mt-0.5 text-white placeholder-white/40 outline-none w-40"
                  value={nameInput} onChange={e => setNameInput(e.target.value)}
                  onBlur={saveName} onKeyDown={e => e.key === 'Enter' && saveName()} placeholder="Your name" />
              ) : (
                <button onClick={() => { setNameInput(name); setEditingName(true) }} className="flex items-center gap-1.5 group mt-0.5">
                  <h1 className="text-xl font-bold">{name ? `${greeting()}, ${name}` : greeting()}</h1>
                  <Pencil size={11} className="text-white/25 group-hover:text-white/60 transition-colors" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <button onClick={toggleHoliday}
                className={cn('px-2.5 py-1.5 rounded-full text-xs transition-colors',
                  isHoliday ? 'bg-amber-400/90 text-amber-950 font-semibold' : 'bg-white/10 hover:bg-white/20 text-white/60')}>
                🏖️
              </button>
              <button onClick={() => setShowReentry(true)}
                className="p-1.5 px-2.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors" title="Just got back?">
                <Plane size={13} className="text-white/60" />
              </button>
            </div>
          </div>

          {/* Score row: ring + synthesized stats */}
          <div className="flex items-center gap-6">
            <ScoreRing value={pct} size={132} sub={isToday ? 'today' : 'day score'} track="rgba(255,255,255,0.08)" />
            <div className="flex-1 grid grid-cols-1 gap-3.5 min-w-0">
              <HeroStat label="Week"
                value={
                  <span className="flex items-center gap-2">
                    {weekScore ? `${weekScore.thisWeek.score}%` : '—'}
                    {weekScore && <Delta value={weekScore.delta} />}
                  </span>
                }
                sub={weekScore ? `${weekScore.thisWeek.completed}/${weekScore.thisWeek.total} this week` : undefined} />
              <HeroStat label="Best streak"
                value={streak && streak.count > 0 ? `${streak.icon ?? '🔥'} ${streak.count} days` : '—'}
                sub={streak && streak.count > 0 ? streak.name : 'complete habits to build one'} />
              <HeroStat label="Done" value={`${totalDone} / ${total}`} sub={isToday ? 'so far today' : undefined} />
            </div>
          </div>

          {/* 14-day trend — tap a bar to jump to that day */}
          {dayScores && dayScores.days.length > 0 && (
            <div className="mt-5">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] font-bold tracking-[0.18em] text-white/35 uppercase">Last 14 days</p>
                <p className="text-[10px] text-white/35">
                  avg {Math.round(dayScores.days.reduce((s, d) => s + d.score, 0) / dayScores.days.length)}%
                </p>
              </div>
              <TrendBars days={dayScores.days} selected={selectedKey} onSelect={selectDay} height={40} />
            </div>
          )}

          {/* Week strip */}
          <div className="relative mt-5 flex items-center justify-between">
            <button onClick={() => setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n })}
              className="p-1.5 rounded-full hover:bg-white/10 transition-colors text-white/50">
              <ChevronLeft size={16} />
            </button>
            <div className="flex gap-1 flex-1 justify-center">
              {days.map(day => {
                const isT = isSameDay(day, today)
                const sel = isSameDay(day, selectedDate)
                const future = day > today
                return (
                  <button key={day.toISOString()} onClick={() => !future && setSelectedDate(startOfDay(new Date(day)))}
                    className={cn('flex flex-col items-center gap-0.5 rounded-2xl transition-all px-1.5 py-2 min-w-[38px]',
                      sel ? 'bg-white' : future ? 'opacity-30 cursor-default' : 'hover:bg-white/10')}>
                    <span className={cn('text-[9px] font-bold tracking-wider',
                      sel ? 'text-indigo-600' : isT ? 'text-white' : 'text-white/40')}>
                      {isT ? 'TDY' : DAY_ABBR[day.getDay()]}
                    </span>
                    <span className={cn('text-sm font-bold', sel ? 'text-indigo-600' : 'text-white')}>
                      {day.getDate()}
                    </span>
                  </button>
                )
              })}
            </div>
            <button onClick={() => setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n })}
              className="p-1.5 rounded-full hover:bg-white/10 transition-colors text-white/50">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Filter tabs ── */}
      <div className="flex gap-1.5 px-4 pt-4 pb-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {FILTER_TABS.map(tab => (
          <button key={tab.key} onClick={() => setFilterTime(tab.key)}
            className={cn('px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors shrink-0',
              filterTime === tab.key ? 'bg-indigo-600 text-white' : 'bg-white/85 dark:bg-gray-900/70 text-gray-500 dark:text-gray-400 border border-black/5 dark:border-white/5')}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Contact alerts ── */}
      {(birthdays.length > 0 || overdue.length > 0) && (
        <div className="px-4 pt-3 space-y-2">
          {birthdays.map(c => {
            const [bm, bd] = (c.birthday ?? '').split('-')
            const isTodayBday = bm === String(today.getMonth() + 1).padStart(2, '0') && bd === String(today.getDate()).padStart(2, '0')
            return (
              <Link key={c.id} href="/people"
                className="flex items-center gap-3 bg-pink-50 dark:bg-pink-950/30 border border-pink-100 dark:border-pink-900/50 rounded-2xl px-4 py-3">
                <span className="text-xl">{c.emoji ?? '👤'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-pink-700 dark:text-pink-300 truncate">
                    {isTodayBday ? `🎂 It's ${c.name}'s birthday today!` : `🎂 ${c.name}'s birthday is coming up`}
                  </p>
                  <p className="text-xs text-pink-500 dark:text-pink-400">{isTodayBday ? 'Don\'t forget to send wishes' : 'Within the next 7 days'}</p>
                </div>
                <Cake size={16} className="text-pink-400 shrink-0" />
              </Link>
            )
          })}

          {overdue.map(c => {
            const daysFreq = FREQ_DAYS[c.reachOutFrequency] ?? 30
            const daysSince = c.lastContactDate
              ? Math.floor((today.getTime() - new Date(c.lastContactDate).getTime()) / 86400000)
              : null
            return (
              <Link key={c.id} href="/people"
                className="flex items-center gap-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50 rounded-2xl px-4 py-3">
                <span className="text-xl">{c.emoji ?? '👤'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-amber-700 dark:text-amber-300 truncate">
                    Reach out to {c.name}
                  </p>
                  <p className="text-xs text-amber-500 dark:text-amber-400">
                    {daysSince != null ? `Last contact ${daysSince}d ago · every ${daysFreq}d` : 'Never contacted'}
                  </p>
                </div>
                <Heart size={16} className="text-amber-400 shrink-0" />
              </Link>
            )
          })}
        </div>
      )}

      {/* ── Habit list ── */}
      <div className="px-4 pb-6">
        {isHoliday ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🏖️</div>
            <p className="font-bold text-lg text-gray-700 dark:text-gray-300">On holiday</p>
            <p className="text-sm text-gray-400 mt-1">Habits are paused. Enjoy the break.</p>
            <button onClick={toggleHoliday} className="mt-4 text-xs text-gray-400 underline">Remove holiday</button>
          </div>
        ) : loading ? (
          <div className="space-y-2 mt-4">
            {[1,2,3,4].map(i => <div key={i} className="h-16 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse" />)}
          </div>
        ) : total === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">✨</div>
            <p className="font-bold text-lg text-gray-700 dark:text-gray-300">Looking Ahead</p>
            <p className="text-sm text-gray-400 mt-1">No habits yet. Add some below.</p>
          </div>
        ) : (
          <>
            {filterTime === 'all' ? (
              pendingGrouped.map(group => (
                <div key={group.key} className="mt-4">
                  <div className="flex items-center justify-between mb-2 px-1">
                    <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">{group.label}</p>
                    <p className="text-[10px] font-bold text-gray-300 dark:text-gray-600">{group.items.length} left</p>
                  </div>
                  <div className="bg-white/85 dark:bg-gray-900/70 rounded-2xl border border-black/5 dark:border-white/5 divide-y divide-black/5 dark:divide-white/5 overflow-hidden">
                    {group.items.map(renderHabit)}
                  </div>
                </div>
              ))
            ) : pending.length > 0 ? (
              <div className="mt-4 bg-white/85 dark:bg-gray-900/70 rounded-2xl border border-black/5 dark:border-white/5 divide-y divide-black/5 dark:divide-white/5 overflow-hidden">
                {pending.map(renderHabit)}
              </div>
            ) : (
              <p className="text-center text-gray-400 text-sm mt-10">No habits in this slot</p>
            )}

            {pending.length === 0 && filterTime === 'all' && done.length > 0 && (
              <div className="text-center pt-10 pb-2">
                <div className="text-5xl mb-3">🎉</div>
                <p className="font-bold text-gray-700 dark:text-gray-200">All done for the day</p>
                <p className="text-xs text-gray-400 mt-1">Every habit completed. Go live your life.</p>
              </div>
            )}

            {done.length > 0 && (
              <div className="mt-6">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2 px-1">✅ Completed</p>
                <div className="bg-white/85 dark:bg-gray-900/70 rounded-2xl border border-black/5 dark:border-white/5 divide-y divide-black/5 dark:divide-white/5 overflow-hidden opacity-60">
                  {done.map(renderHabit)}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      {showReentry && <ReentryModal onClose={() => setShowReentry(false)} />}
    </div>
  )
}
