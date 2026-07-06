import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, startOfDay as dfStartOfDay, endOfDay } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRSD(amount: number): string {
  return new Intl.NumberFormat('sr-RS', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount) + ' RSD'
}

export function formatEUR(amount: number): string {
  return '€' + new Intl.NumberFormat('sr-RS', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)
}

export function formatDate(date: Date | string): string {
  return format(new Date(date), 'dd/MM/yyyy')
}

export type Period = 'day' | 'week' | 'month' | 'year' | 'all'

export function getDateRange(period: Period, date: Date): { start: Date; end: Date } | null {
  if (period === 'all') return null
  const d = new Date(date)
  switch (period) {
    case 'day': return { start: dfStartOfDay(d), end: endOfDay(d) }
    case 'week': return { start: startOfWeek(d, { weekStartsOn: 1 }), end: endOfWeek(d, { weekStartsOn: 1 }) }
    case 'month': return { start: startOfMonth(d), end: endOfMonth(d) }
    case 'year': return { start: startOfYear(d), end: endOfYear(d) }
  }
}

// EUR/RSD barely moves intraday — cache for an hour so dashboard
// loads never block on an external API call.
let rateCache: { value: number; at: number } | null = null
const RATE_CACHE_MS = 60 * 60 * 1000

export async function getLiveRate(): Promise<number> {
  if (rateCache && Date.now() - rateCache.at < RATE_CACHE_MS) return rateCache.value

  // Try multiple sources in order — first one that works wins
  const sources = [
    'https://api.frankfurter.dev/v1/latest?base=EUR&symbols=RSD',
    'https://api.frankfurter.app/latest?from=EUR&to=RSD',
    'https://open.er-api.com/v6/latest/EUR',
  ]

  for (const url of sources) {
    try {
      const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(3000) })
      if (!res.ok) continue
      const data = await res.json()

      // Frankfurter / er-api format: { rates: { RSD: 117.20 } }
      if (typeof data.rates?.RSD === 'number') {
        rateCache = { value: data.rates.RSD, at: Date.now() }
        return data.rates.RSD
      }
    } catch (e) {
      console.error('rate fetch failed for', url, e)
    }
  }

  console.warn('all live rate sources failed, returning fallback')
  return rateCache?.value ?? 117.5
}

// ─── Habit utilities (used by life module) ────────────────────────────────────

export function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

// startOfDay() truncates using the RUNNING PROCESS's local timezone —
// fine for purely client-side comparisons, but wrong for anything that
// crosses the client/server boundary (habit log dates): if the server
// process isn't in the same timezone the client assumed, the "day" shifts
// and logs land in the wrong bucket. Use this instead for habit-log dates —
// pure string slicing + Date.UTC, zero dependency on process timezone.
export function utcMidnight(input: string): Date {
  const ymd = input.slice(0, 10) // "YYYY-MM-DD" from either a bare date or a full ISO string
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0))
}

type HabitSchedule = {
  frequency: string
  frequencyDays: number[]
  createdAt: Date | string
}

export function isScheduledDay(habit: HabitSchedule, date: Date): boolean {
  switch (habit.frequency) {
    case 'daily':
      return true
    case 'every_other_day': {
      const created = startOfDay(new Date(habit.createdAt))
      const target = startOfDay(date)
      const diffDays = Math.round((target.getTime() - created.getTime()) / 86400000)
      return diffDays % 2 === 0
    }
    case 'every_n_days': {
      const n = habit.frequencyDays[0] ?? 1
      const created = startOfDay(new Date(habit.createdAt))
      const target = startOfDay(date)
      const diffDays = Math.round((target.getTime() - created.getTime()) / 86400000)
      return diffDays % n === 0
    }
    case 'specific_days':
      return habit.frequencyDays.includes(date.getDay())
    default:
      return true
  }
}

type HabitWithLogs = HabitSchedule & {
  logs: { date: Date | string; completed: boolean }[]
}

export function calcStreak(habit: HabitWithLogs): number {
  const today = startOfDay(new Date())
  const logMap = new Map<number, boolean>()
  for (const log of habit.logs) {
    const d = startOfDay(new Date(log.date))
    logMap.set(d.getTime(), log.completed)
  }
  let streak = 0
  const cursor = new Date(today)
  for (let i = 0; i < 365 * 3; i++) {
    if (!isScheduledDay(habit, cursor)) { cursor.setDate(cursor.getDate() - 1); continue }
    const completed = logMap.get(cursor.getTime())
    if (cursor.getTime() === today.getTime() && completed === undefined) { cursor.setDate(cursor.getDate() - 1); continue }
    if (!completed) break
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

export function calcLongestStreak(habit: HabitWithLogs): number {
  if (habit.logs.length === 0) return 0
  const logMap = new Map<number, boolean>()
  for (const log of habit.logs) {
    const d = startOfDay(new Date(log.date))
    logMap.set(d.getTime(), log.completed)
  }
  const sorted = [...habit.logs].map(l => startOfDay(new Date(l.date))).sort((a, b) => a.getTime() - b.getTime())
  if (sorted.length === 0) return 0
  const first = sorted[0]
  const last = startOfDay(new Date())
  let longest = 0, current = 0
  const cursor = new Date(first)
  while (cursor <= last) {
    if (isScheduledDay(habit, cursor)) {
      if (logMap.get(cursor.getTime())) { current++; longest = Math.max(longest, current) }
      else { current = 0 }
    }
    cursor.setDate(cursor.getDate() + 1)
  }
  return longest
}

export function calcCompletionRate(habit: HabitWithLogs, from: Date, to: Date): number {
  const today = startOfDay(new Date())
  const logMap = new Map<number, boolean>()
  for (const log of habit.logs) {
    const d = startOfDay(new Date(log.date))
    logMap.set(d.getTime(), log.completed)
  }
  let scheduled = 0, completed = 0
  const cursor = startOfDay(new Date(from))
  const end = startOfDay(new Date(to))
  while (cursor <= end && cursor <= today) {
    if (isScheduledDay(habit, cursor)) {
      scheduled++
      if (logMap.get(cursor.getTime())) completed++
    }
    cursor.setDate(cursor.getDate() + 1)
  }
  if (scheduled === 0) return 0
  return Math.round((completed / scheduled) * 100)
}

// ─── Finance utilities ────────────────────────────────────────────────────────

export function calcAccountBalance(
  account: { startingBalance: number; manualOverride?: number | null; overrideDate?: Date | null },
  income: number,
  expenses: number,
  conversions: number,
  transfers: number
): number {
  if (account.manualOverride != null) {
    return account.manualOverride + income - expenses + conversions + transfers
  }
  return account.startingBalance + income - expenses + conversions + transfers
}