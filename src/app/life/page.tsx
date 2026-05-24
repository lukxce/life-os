'use client'
import { useEffect, useState, useCallback } from 'react'
import { HabitCard } from '@/components/habits/HabitCard'
import { ReentryModal } from '@/components/habits/ReentryModal'
import { calcStreak, startOfDay } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight, Pencil, TrendingUp, TrendingDown, Minus, Plane } from 'lucide-react'

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

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

interface WeekScore { score: number; completed: number; total: number }
interface ScoreData { thisWeek: WeekScore; lastWeek: WeekScore; delta: number; direction: 'up' | 'down' | 'same' }

export default function TodayPage() {
  const [items, setItems] = useState<TodayItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()))
  const [weekStart, setWeekStart] = useState<Date>(() => mondayOf(new Date()))
  const [filterTime, setFilterTime] = useState('all')
  const [name, setName] = useState('')
  const [weekScore, setWeekScore] = useState<ScoreData | null>(null)
  const [showReentry, setShowReentry] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [holidays, setHolidays] = useState<Set<string>>(new Set())

  const today = startOfDay(new Date())
  const isToday = isSameDay(selectedDate, today)
  const days = weekDays(weekStart)
  const selectedKey = selectedDate.toISOString().split('T')[0]
  const isHoliday = holidays.has(selectedKey)

  function toggleHoliday() {
    const next = new Set(holidays)
    if (isHoliday) next.delete(selectedKey)
    else next.add(selectedKey)
    setHolidays(next)
    localStorage.setItem('holidays', JSON.stringify(Array.from(next)))
  }

  useEffect(() => {
    const saved = localStorage.getItem('userName')
    if (saved) setName(saved)
    fetch('/api/life/weekly-score').then(r => r.json()).then(setWeekScore).catch(() => {})
    try {
      const h = JSON.parse(localStorage.getItem('holidays') ?? '[]')
      setHolidays(new Set(h))
    } catch { /* ignore */ }
  }, [])

  function saveName() {
    const n = nameInput.trim()
    if (n) { setName(n); localStorage.setItem('userName', n) }
    setEditingName(false)
  }

  const load = useCallback(async (date: Date) => {
    setLoading(true)
    const res = await fetch(`/api/life/today?date=${date.toISOString().split('T')[0]}`)
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
  }

  async function handleQuantity(item: TodayItem, value: number) {
    const completed = item.habit.target != null && value >= item.habit.target
    setItems(prev => prev.map(i => i.habit.id === item.habit.id ? { ...i, log: { ...(i.log ?? {}), value, completed } } : i))
    await fetch('/api/life/logs', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ habitId: item.habit.id, date: selectedDate.toISOString(), completed, value }) })
  }

  async function handleSubTask(item: TodayItem, subTaskId: string, checked: boolean) {
    const prev = item.log?.completedSubTaskIds ?? []
    const completedSubTaskIds = checked ? [...prev.filter(id => id !== subTaskId), subTaskId] : prev.filter(id => id !== subTaskId)
    const allDone = item.habit.subTasks.length > 0 && completedSubTaskIds.length >= item.habit.subTasks.length
    const completed = allDone || (item.log?.completed ?? false)
    setItems(prev => prev.map(i => i.habit.id === item.habit.id ? { ...i, log: { ...(i.log ?? {}), completed, completedSubTaskIds } } : i))
    await fetch('/api/life/logs', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ habitId: item.habit.id, date: selectedDate.toISOString(), completed, value: item.log?.value ?? null, completedSubTaskIds }) })
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

  return (
    <div className="-mx-4 -mt-6 md:-mt-8">
      {/* ── Hero ── */}
      <div className="relative bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-500 px-5 pt-10 pb-6 text-white overflow-hidden rounded-b-[2.5rem]">
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/5" />
        <div className="absolute top-16 -left-10 w-32 h-32 rounded-full bg-white/5" />

        {/* Date + greeting */}
        <div className="relative">
          <p className="text-xs font-semibold tracking-widest text-white/60 uppercase mb-1">
            {selectedDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase()}
          </p>

          {editingName ? (
            <div className="flex items-center gap-2 mb-3">
              <input autoFocus className="text-2xl font-bold bg-white/20 rounded-xl px-3 py-1 text-white placeholder-white/50 outline-none w-40"
                value={nameInput} onChange={e => setNameInput(e.target.value)}
                onBlur={saveName} onKeyDown={e => e.key === 'Enter' && saveName()} placeholder="Your name" />
            </div>
          ) : (
            <button onClick={() => { setNameInput(name); setEditingName(true) }} className="flex items-center gap-2 mb-3 group">
              <h1 className="text-2xl font-bold">{name ? `Hi, ${name}` : greeting()} 👋</h1>
              <Pencil size={14} className="text-white/40 group-hover:text-white/70 transition-colors" />
            </button>
          )}

          {total > 0 && (
            <div>
              <div className="flex justify-between text-xs text-white/60 mb-1">
                <span>{totalDone}/{total} done today</span>
                <span>{pct}%</span>
              </div>
              <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )}

          {/* Weekly score row */}
          <div className="flex items-center justify-between mt-3">
            {weekScore ? (() => {
              const DirIcon = weekScore.direction === 'up' ? TrendingUp : weekScore.direction === 'down' ? TrendingDown : Minus
              const deltaStr = weekScore.delta > 0 ? `+${weekScore.delta}%` : weekScore.delta < 0 ? `${weekScore.delta}%` : '='
              return (
                <div className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1">
                  <DirIcon size={12} className="text-white/70" />
                  <span className="text-xs text-white/80 font-medium">Week: {weekScore.thisWeek.score}%</span>
                  <span className="text-xs text-white/50">{deltaStr}</span>
                </div>
              )
            })() : <div />}
            <div className="flex items-center gap-1.5">
              <button
                onClick={toggleHoliday}
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-3 py-1 transition-colors',
                  isHoliday ? 'bg-amber-400/90 text-amber-900' : 'bg-white/10 hover:bg-white/20 text-white/70'
                )}
              >
                <span className="text-xs">🏖️</span>
                <span className="text-xs font-medium">{isHoliday ? 'On holiday' : 'Holiday'}</span>
              </button>
              <button
                onClick={() => setShowReentry(true)}
                className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 transition-colors rounded-full px-3 py-1"
              >
                <Plane size={12} className="text-white/70" />
                <span className="text-xs text-white/70">Just got back?</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── Week strip ── */}
        <div className="relative mt-5">
          <div className="flex items-center justify-between">
            <button onClick={() => setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n })}
              className="p-1.5 rounded-full hover:bg-white/10 transition-colors text-white/60">
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
                      sel ? 'text-indigo-600' : isT ? 'text-white' : 'text-white/50')}>
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
              className="p-1.5 rounded-full hover:bg-white/10 transition-colors text-white/60">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Filter tabs ── */}
      <div className="flex gap-1.5 px-4 pt-3 pb-1 overflow-x-auto bg-gray-50 dark:bg-gray-950" style={{ scrollbarWidth: 'none' }}>
        {FILTER_TABS.map(tab => (
          <button key={tab.key} onClick={() => setFilterTime(tab.key)}
            className={cn('px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors shrink-0',
              filterTime === tab.key ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-800')}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Habit list ── */}
      <div className="px-4 pb-6 bg-gray-50 dark:bg-gray-950 min-h-screen">
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
                  <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2 px-1">{group.label}</p>
                  <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800 overflow-hidden">
                    {group.items.map(renderHabit)}
                  </div>
                </div>
              ))
            ) : pending.length > 0 ? (
              <div className="mt-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800 overflow-hidden">
                {pending.map(renderHabit)}
              </div>
            ) : (
              <p className="text-center text-gray-400 text-sm mt-10">No habits in this slot</p>
            )}

            {done.length > 0 && (
              <div className="mt-6">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2 px-1">✅ Completed</p>
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800 overflow-hidden opacity-60">
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
