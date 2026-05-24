'use client'
import { useEffect, useState, useCallback } from 'react'
import { startOfDay } from '@/lib/utils'
import { Check, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { cn } from '@/lib/utils'

interface SubTask { id: string; name: string; order: number }
interface Habit {
  id: string; name: string; category: string; type: string
  icon?: string | null; color?: string | null; unit?: string | null; target?: number | null
  frequency: string; frequencyDays: number[]; timeOfDay: string; createdAt: string
  subTasks: SubTask[]
}
interface Log { date: string; completed: boolean; value?: number | null }
interface WeekItem { habit: Habit; completedThisWeek: boolean; thisWeekLog: Log | null; recentLogs: Log[] }
interface WeekScore { score: number; completed: number; total: number }
interface ScoreData { thisWeek: WeekScore; lastWeek: WeekScore; delta: number; direction: 'up' | 'down' | 'same' }

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function toLocalISODate(d: Date): string {
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${mo}-${day}`
}

function mondayOf(date: Date): Date {
  const d = startOfDay(new Date(date))
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  return d
}

function formatWeekRange(monday: Date): string {
  const sunday = new Date(monday)
  sunday.setDate(sunday.getDate() + 6)
  const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  return `${fmt(monday)} – ${fmt(sunday)}`
}

function WeightGraph({ logs }: { logs: Log[] }) {
  const data = logs
    .filter(l => l.value != null && l.value > 0)
    .map(l => ({
      date: new Date(l.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      kg: Math.round((l.value ?? 0) * 10) / 10,
    }))
    .slice(-12)

  if (data.length < 2) return null

  const min = Math.min(...data.map(d => d.kg)) - 1
  const max = Math.max(...data.map(d => d.kg)) + 1

  return (
    <div className="mt-3">
      <p className="text-xs text-gray-400 mb-1.5">Weight history</p>
      <ResponsiveContainer width="100%" height={100}>
        <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
          <XAxis dataKey="date" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
          <YAxis domain={[min, max]} tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{ fontSize: 11, borderRadius: 8, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}
            formatter={(v: number) => [`${v} kg`, 'Weight']}
          />
          <Line type="monotone" dataKey="kg" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3, fill: '#8b5cf6' }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function WeeklyHabitRow({ item, onToggle, onValue }: {
  item: WeekItem
  onToggle: (completed: boolean) => void
  onValue: (value: number) => void
}) {
  const { habit, completedThisWeek, thisWeekLog, recentLogs } = item
  const accentColor = habit.color ?? '#6366f1'
  const [inputVal, setInputVal] = useState(String(thisWeekLog?.value ?? ''))
  const [editing, setEditing] = useState(false)
  const isWeight = habit.unit === 'kg'
  const recommendedDays = habit.frequencyDays.map(d => DAY_NAMES[d]).join(', ')

  function commitValue() {
    const v = parseFloat(inputVal)
    if (!isNaN(v) && v > 0) onValue(v)
    setEditing(false)
  }

  if (habit.type === 'boolean') {
    return (
      <button
        onClick={() => onToggle(!completedThisWeek)}
        className={cn(
          'w-full flex items-center gap-4 px-4 py-3.5 transition-colors text-left',
          completedThisWeek ? 'bg-gray-50 dark:bg-gray-800/30 opacity-80' : 'active:bg-gray-50 dark:active:bg-gray-800/20'
        )}
      >
        <span
          className="w-9 h-9 rounded-full flex items-center justify-center text-base shrink-0"
          style={{ backgroundColor: accentColor + '22' }}
        >
          {habit.icon ?? '📋'}
        </span>
        <div className="flex-1 min-w-0 text-left">
          <p className={cn('text-sm font-medium', completedThisWeek ? 'line-through text-gray-400' : 'text-gray-900 dark:text-gray-100')}>
            {habit.name}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {habit.category}
            {recommendedDays && <span className="ml-2 text-indigo-400">· rec. {recommendedDays}</span>}
          </p>
        </div>
        <span
          className="w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all"
          style={completedThisWeek ? { backgroundColor: accentColor, borderColor: accentColor } : { borderColor: '#d1d5db' }}
        >
          {completedThisWeek && <Check size={12} strokeWidth={3} className="text-white" />}
        </span>
      </button>
    )
  }

  // Quantity (e.g. weight)
  return (
    <div className="px-4 py-3.5">
      <div className="flex items-center gap-4">
        <span
          className="w-9 h-9 rounded-full flex items-center justify-center text-base shrink-0"
          style={{ backgroundColor: accentColor + '22' }}
        >
          {habit.icon ?? '📋'}
        </span>
        <div className="flex-1 min-w-0">
          <p className={cn('text-sm font-medium', completedThisWeek ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-gray-100')}>
            {habit.name}
            {completedThisWeek && <span className="ml-1.5 text-xs">✓</span>}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {habit.category}
            {recommendedDays && <span className="ml-2 text-indigo-400">· rec. {recommendedDays}</span>}
          </p>
        </div>
        <div className="shrink-0">
          {editing ? (
            <input
              autoFocus
              type="number"
              step="0.1"
              className="w-20 text-sm font-semibold bg-gray-100 dark:bg-gray-800 rounded-lg px-2 py-1 outline-none text-center"
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              onBlur={commitValue}
              onKeyDown={e => { if (e.key === 'Enter') commitValue() }}
            />
          ) : (
            <button
              onClick={() => { setInputVal(String(thisWeekLog?.value ?? '')); setEditing(true) }}
              className="text-sm font-semibold px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
            >
              {thisWeekLog?.value != null ? `${thisWeekLog.value} ${habit.unit ?? ''}` : `Log ${habit.unit ?? ''}`}
            </button>
          )}
        </div>
      </div>
      {isWeight && <WeightGraph logs={recentLogs} />}
    </div>
  )
}

export default function WeeklyPage() {
  const [items, setItems] = useState<WeekItem[]>([])
  const [scoreData, setScoreData] = useState<ScoreData | null>(null)
  const [loading, setLoading] = useState(true)

  const monday = mondayOf(new Date())
  const weekRange = formatWeekRange(monday)

  const load = useCallback(async () => {
    setLoading(true)
    const [habitsRes, scoreRes] = await Promise.all([
      fetch('/api/life/weekly-habits'),
      fetch('/api/life/weekly-score'),
    ])
    setItems(await habitsRes.json())
    setScoreData(await scoreRes.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function logForToday(habitId: string, completed: boolean, value?: number) {
    const dateStr = toLocalISODate(new Date()) + 'T12:00:00.000Z'
    await fetch('/api/life/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ habitId, date: dateStr, completed, value: value ?? null }),
    })
    load()
  }

  const DirIcon = scoreData?.direction === 'up' ? TrendingUp : scoreData?.direction === 'down' ? TrendingDown : Minus
  const dirColor = scoreData?.direction === 'up' ? 'text-green-400' : scoreData?.direction === 'down' ? 'text-red-400' : 'text-gray-400'

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-32 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse" />
        {[1, 2, 3, 4].map(i => <div key={i} className="h-16 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse" />)}
      </div>
    )
  }

  const byCategory = items.reduce<Record<string, WeekItem[]>>((acc, item) => {
    const cat = item.habit.category
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Weekly</h1>
        <p className="text-sm text-gray-400 mt-0.5">{weekRange}</p>
      </div>

      {/* Score card */}
      {scoreData && (
        <div className="bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl p-5 text-white">
          <p className="text-xs font-semibold tracking-widest uppercase text-white/60 mb-1">Weekly Score</p>
          <div className="flex items-end gap-3">
            <span className="text-5xl font-bold">{scoreData.thisWeek.score}%</span>
            {scoreData.lastWeek.total > 0 && (
              <div className={cn('flex items-center gap-1 pb-1 text-white/80', dirColor)}>
                <DirIcon size={18} />
                <span className="text-sm font-semibold">
                  {scoreData.delta > 0 ? '+' : ''}{scoreData.delta}% vs last week
                </span>
              </div>
            )}
          </div>
          <div className="mt-3 w-full h-2 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all duration-700" style={{ width: `${scoreData.thisWeek.score}%` }} />
          </div>
          {scoreData.thisWeek.total > 0
            ? <p className="text-xs text-white/60 mt-2">{scoreData.thisWeek.completed} of {scoreData.thisWeek.total} habit days logged this week</p>
            : <p className="text-xs text-white/60 mt-2">Start logging habits on the Today tab to build your score</p>
          }
        </div>
      )}

      {/* Weekly habits by category */}
      {items.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 text-center text-gray-400">
          <div className="text-3xl mb-2">📅</div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No weekly habits yet</p>
          <p className="text-xs mt-1 text-gray-400">Add habits with a specific day schedule (e.g. every Sunday) and they'll appear here.</p>
        </div>
      ) : (
        Object.entries(byCategory).map(([category, categoryItems]) => (
          <section key={category}>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">
              {category}
            </h2>
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800 overflow-hidden">
              {categoryItems.map(item => (
                <WeeklyHabitRow
                  key={item.habit.id}
                  item={item}
                  onToggle={completed => logForToday(item.habit.id, completed)}
                  onValue={value => logForToday(item.habit.id, true, value)}
                />
              ))}
            </div>
          </section>
        ))
      )}

      {/* Last week score */}
      {scoreData && scoreData.lastWeek.total > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Last week</p>
            <p className="text-2xl font-bold text-gray-700 dark:text-gray-300 mt-0.5">{scoreData.lastWeek.score}%</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">{scoreData.lastWeek.completed} / {scoreData.lastWeek.total} habits</p>
          </div>
        </div>
      )}
    </div>
  )
}
