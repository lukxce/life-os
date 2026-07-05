'use client'
import { useEffect, useState, useCallback } from 'react'
import { startOfDay } from '@/lib/utils'
import { Check, TrendingUp, TrendingDown, Minus, ChevronRight } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { cn } from '@/lib/utils'
import Link from 'next/link'

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
interface BodyRow { id: string; date: string; metric: string; value: number }

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// ── Metric config ──────────────────────────────────────────────────────────────

const WEEKLY_METRICS = [
  { key: 'weight',    label: 'Weight',    unit: 'kg',  icon: '⚖️',  color: '#8b5cf6' },
  { key: 'waist',     label: 'Waist',     unit: 'cm',  icon: '📏',  color: '#3b82f6' },
] as const

const MONTHLY_METRICS = [
  { key: 'chest',     label: 'Chest',     unit: 'cm',  icon: '💪',  color: '#10b981' },
  { key: 'bicep',     label: 'Bicep',     unit: 'cm',  icon: '💪',  color: '#f59e0b' },
  { key: 'shoulders', label: 'Shoulders', unit: 'cm',  icon: '🏋️', color: '#ef4444' },
  { key: 'thigh',     label: 'Thigh',     unit: 'cm',  icon: '🦵',  color: '#ec4899' },
] as const

const ALL_METRICS = [...WEEKLY_METRICS, ...MONTHLY_METRICS]

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function isFirstSundayOfMonth(date: Date): boolean {
  if (date.getDay() !== 0) return false
  return date.getDate() <= 7
}

function daysSince(rows: BodyRow[], metric: string): number | null {
  const last = [...rows].filter(r => r.metric === metric).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
  if (!last) return null
  return Math.floor((Date.now() - new Date(last.date).getTime()) / 86400000)
}

// ── Sparkline ─────────────────────────────────────────────────────────────────

function Sparkline({ data, color, unit }: { data: BodyRow[]; color: string; unit: string }) {
  if (data.length < 2) return null
  const pts = data.slice(-10).map(r => ({
    v: r.value,
    label: new Date(r.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
  }))
  const min = Math.min(...pts.map(p => p.v)) * 0.995
  const max = Math.max(...pts.map(p => p.v)) * 1.005
  return (
    <ResponsiveContainer width="100%" height={52}>
      <LineChart data={pts} margin={{ top: 2, right: 4, bottom: 0, left: -32 }}>
        <YAxis domain={[min, max]} hide />
        <XAxis dataKey="label" hide />
        <Tooltip
          contentStyle={{ fontSize: 10, borderRadius: 6, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}
          formatter={(v: number) => [`${v} ${unit}`, '']}
          labelFormatter={(l) => l}
        />
        <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2}
          dot={{ r: 2.5, fill: color, strokeWidth: 0 }}
          activeDot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}

// ── Metric input row ──────────────────────────────────────────────────────────

function MetricRow({
  metricKey, label, unit, icon, color,
  todayValue, history,
  onSave,
}: {
  metricKey: string; label: string; unit: string; icon: string; color: string
  todayValue: number | null
  history: BodyRow[]
  onSave: (metric: string, value: number) => void
}) {
  const [editing, setEditing] = useState(false)
  const [input, setInput]     = useState(todayValue != null ? String(todayValue) : '')

  // keep input in sync when todayValue arrives from parent
  useEffect(() => {
    if (!editing) setInput(todayValue != null ? String(todayValue) : '')
  }, [todayValue, editing])

  // Trend vs previous entry
  const prev = history.filter(r => r.metric === metricKey).at(-2)?.value ?? null
  const curr = history.filter(r => r.metric === metricKey).at(-1)?.value ?? null
  const delta = prev != null && curr != null ? Math.round((curr - prev) * 10) / 10 : null

  function commit() {
    const v = parseFloat(input.replace(',', '.'))
    if (!isNaN(v) && v > 0) onSave(metricKey, v)
    setEditing(false)
  }

  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="text-xl w-8 text-center shrink-0">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</span>
            {delta != null && (
              <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                delta < 0 && metricKey === 'weight'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : delta > 0 && metricKey === 'weight'
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400')}>
                {delta > 0 ? '+' : ''}{delta} {unit}
              </span>
            )}
          </div>
          <div className="mt-1.5">
            <Sparkline data={history.filter(r => r.metric === metricKey)} color={color} unit={unit} />
          </div>
        </div>
        <div className="shrink-0">
          {editing ? (
            <input
              autoFocus
              type="number"
              inputMode="decimal"
              step="0.1"
              placeholder={`0 ${unit}`}
              className="w-24 text-sm font-semibold text-center bg-gray-100 dark:bg-gray-800 rounded-xl px-2 py-1.5 outline-none"
              value={input}
              onChange={e => setInput(e.target.value)}
              onBlur={commit}
              onKeyDown={e => { if (e.key === 'Enter') commit() }}
            />
          ) : (
            <button
              onClick={() => { setInput(todayValue != null ? String(todayValue) : ''); setEditing(true) }}
              className={cn(
                'text-sm font-semibold px-3 py-1.5 rounded-xl transition-colors',
                todayValue != null
                  ? 'text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              )}
              style={todayValue != null ? { background: color } : undefined}
            >
              {todayValue != null ? `${todayValue} ${unit}` : `Log ${unit}`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Weekly habit row (unchanged) ──────────────────────────────────────────────

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
              autoFocus type="number" step="0.1"
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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function WeeklyPage() {
  const [items, setItems]           = useState<WeekItem[]>([])
  const [scoreData, setScoreData]   = useState<ScoreData | null>(null)
  const [loading, setLoading]       = useState(true)
  const [bodyHistory, setBodyHistory] = useState<BodyRow[]>([])
  const [todayBody, setTodayBody]   = useState<Record<string, number | null>>({})

  const monday    = mondayOf(new Date())
  const weekRange = formatWeekRange(monday)
  const today     = new Date()
  const todayKey  = toLocalISODate(today)
  const isFirstSundayOfMonth_ = isFirstSundayOfMonth(today)

  const load = useCallback(async () => {
    setLoading(true)
    const metricKeys = ALL_METRICS.map(m => m.key).join(',')
    const [habitsRes, scoreRes, historyRes] = await Promise.all([
      fetch('/api/life/weekly-habits'),
      fetch('/api/life/weekly-score'),
      fetch(`/api/life/body-metrics?metrics=${metricKeys}`),
    ])
    setItems(await habitsRes.json())
    setScoreData(await scoreRes.json())
    const hist: BodyRow[] = await historyRes.json()
    setBodyHistory(hist)
    // Derive today's logged values
    const todayMap: Record<string, number | null> = {}
    ALL_METRICS.forEach(m => {
      const row = hist.find(r => r.metric === m.key && r.date.startsWith(todayKey))
      todayMap[m.key] = row?.value ?? null
    })
    setTodayBody(todayMap)
    setLoading(false)
  }, [todayKey])

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

  async function saveMetric(metric: string, value: number) {
    await fetch('/api/life/body-metrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ metric, value, date: todayKey }),
    })
    setTodayBody(prev => ({ ...prev, [metric]: value }))
    // Optimistically update history
    setBodyHistory(prev => {
      const without = prev.filter(r => !(r.metric === metric && r.date.startsWith(todayKey)))
      return [...without, { id: 'temp', date: todayKey + 'T00:00:00.000Z', metric, value }]
    })
  }

  const DirIcon  = scoreData?.direction === 'up' ? TrendingUp : scoreData?.direction === 'down' ? TrendingDown : Minus
  const dirColor = scoreData?.direction === 'up' ? 'text-green-400' : scoreData?.direction === 'down' ? 'text-red-400' : 'text-gray-400'

  // Monthly metrics: show if first Sunday OR overdue (> 28 days since last log)
  const showMonthly = isFirstSundayOfMonth_ || MONTHLY_METRICS.some(m => {
    const d = daysSince(bodyHistory, m.key)
    return d === null || d > 28
  })

  const monthlyOverdue = MONTHLY_METRICS.map(m => {
    const d = daysSince(bodyHistory, m.key)
    return { ...m, overdue: d === null || d > 28, daysSince: d }
  })

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

      {/* ── Body Metrics ─────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
            📏 Body Metrics
          </h2>
          <Link href="/fitness/body"
            className="flex items-center gap-0.5 text-xs text-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium">
            All charts <ChevronRight size={13} />
          </Link>
        </div>

        {/* Weekly: weight + waist */}
        <div className="bg-white/85 dark:bg-gray-900/70 rounded-2xl border border-black/5 dark:border-white/5 divide-y divide-black/5 dark:divide-white/5 overflow-hidden mb-3">
          <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800/50">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Weekly — every Sunday</p>
          </div>
          {WEEKLY_METRICS.map(m => (
            <MetricRow
              key={m.key}
              metricKey={m.key}
              label={m.label}
              unit={m.unit}
              icon={m.icon}
              color={m.color}
              todayValue={todayBody[m.key] ?? null}
              history={bodyHistory}
              onSave={saveMetric}
            />
          ))}
        </div>

        {/* Monthly: chest, bicep, shoulders, thigh */}
        <div className="bg-white/85 dark:bg-gray-900/70 rounded-2xl border border-black/5 dark:border-white/5 divide-y divide-black/5 dark:divide-white/5 overflow-hidden">
          <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Monthly measurements</p>
            {!showMonthly && (
              <p className="text-[10px] text-gray-400">Next due next month</p>
            )}
          </div>
          {monthlyOverdue.map(m => (
            <div key={m.key} className={cn(!showMonthly && 'opacity-40 pointer-events-none')}>
              <MetricRow
                metricKey={m.key}
                label={m.label}
                unit={m.unit}
                icon={m.icon}
                color={m.color}
                todayValue={todayBody[m.key] ?? null}
                history={bodyHistory}
                onSave={saveMetric}
              />
              {m.daysSince != null && !m.overdue && (
                <p className="text-[10px] text-gray-400 px-4 pb-2 -mt-1">
                  Last logged {m.daysSince}d ago
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Weekly habits by category */}
      {items.length === 0 ? (
        <div className="bg-white/85 dark:bg-gray-900/70 rounded-2xl border border-black/5 dark:border-white/5 p-6 text-center text-gray-400">
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
            <div className="bg-white/85 dark:bg-gray-900/70 rounded-2xl border border-black/5 dark:border-white/5 divide-y divide-black/5 dark:divide-white/5 overflow-hidden">
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
        <div className="bg-white/85 dark:bg-gray-900/70 rounded-2xl border border-black/5 dark:border-white/5 p-4 flex items-center justify-between">
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
