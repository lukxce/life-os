'use client'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

// ── Shared data layer for the design-lab prototypes ──────────────────────────
// Same real endpoints as production Home — the prototypes differ ONLY in
// presentation, so the comparison is honest: identical data, identical
// interactions, two visual languages.

export interface RightNowItem {
  id: string; kind: 'meeting' | 'meal' | 'habit' | 'training'; title: string; detail: string; href: string
  habits?: { id: string; name: string }[]
  mealAsk?: { mealType: string; date: string }
}
export interface TodayCalendarRow { id: string; time: string; minutes: number; title: string; color: string }
export interface RightNow {
  top: RightNowItem | null; upcomingCalendar: RightNowItem[]; timeOfDay: string; mood: 'content' | 'curious' | 'pleased' | 'sleepy'
  todayCalendarEvents: TodayCalendarRow[]
}
export interface DayScore { date: string; score: number; completed: number; total: number }
export interface DayScores { days: DayScore[]; bestStreak: { name: string; icon: string | null; count: number } }
export interface AccountRow { id: string; name: string; currency: string; currentBalance: number; pinned: boolean }
export interface DailyTaskRow { id: string; text: string; completed: boolean; priority: boolean }
export interface WaterLogRow { id: string; drink: string; volumeMl: number }
export interface CatchUp {
  pendingHabits: { id: string; name: string }[]
  unloggedMeals: { mealType: string; plannedName: string }[]
  expensesToday: number
  noExpenses: boolean
}
export interface DashboardData {
  finance: { upcomingBills: { id: string; name: string; amount: number; currency: string; dayOfMonth: number }[] }
  life: { habitsScheduledToday: number; habitsCompletedToday: number }
}

export function toLocalDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

async function safeJson<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json()
}

export function useHomeData() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [rightNow, setRightNow] = useState<RightNow | null>(null)
  const [dayScores, setDayScores] = useState<DayScores | null>(null)
  const [agenda, setAgenda] = useState<TodayCalendarRow[] | null>(null)
  const [accounts, setAccounts] = useState<AccountRow[] | null>(null)
  const [catchUp, setCatchUp] = useState<CatchUp | null>(null)
  const [todayTasks, setTodayTasks] = useState<DailyTaskRow[] | null>(null)
  const [tomorrowTasks, setTomorrowTasks] = useState<DailyTaskRow[] | null>(null)
  const [taskStreak, setTaskStreak] = useState(0)
  const [waterLogs, setWaterLogs] = useState<WaterLogRow[] | null>(null)
  const [justDone, setJustDone] = useState<Set<string>>(new Set())
  const [taskJustDone, setTaskJustDone] = useState<Set<string>>(new Set())
  const [catchDone, setCatchDone] = useState<Set<string>>(new Set())

  const now = new Date()
  const todayStr = toLocalDateStr(now)
  const tomorrowStr = toLocalDateStr(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1))

  const loadRightNow = useCallback(() => {
    const n = new Date()
    const p = new URLSearchParams({
      h: String(n.getHours()), m: String(n.getMinutes()),
      dow: String(n.getDay()), date: toLocalDateStr(n), ts: String(n.getTime()),
    })
    fetch(`/api/right-now?${p}`, { cache: 'no-store' }).then(safeJson<RightNow>).then(rn => {
      setRightNow(rn)
      setAgenda(rn.todayCalendarEvents ?? [])
    }).catch(() => {})
  }, [])

  const loadCatchUp = useCallback(() => {
    const n = new Date()
    const p = new URLSearchParams({ h: String(n.getHours()), m: String(n.getMinutes()), date: toLocalDateStr(n) })
    fetch(`/api/life/catch-up?${p}`, { cache: 'no-store' }).then(safeJson<CatchUp>).then(setCatchUp).catch(() => {})
  }, [])

  const loadTasks = useCallback(() => {
    fetch(`/api/life/tasks?date=${todayStr}`, { cache: 'no-store' }).then(safeJson<DailyTaskRow[]>).then(setTodayTasks).catch(() => {})
    fetch(`/api/life/tasks?date=${tomorrowStr}`, { cache: 'no-store' }).then(safeJson<DailyTaskRow[]>).then(setTomorrowTasks).catch(() => {})
    fetch(`/api/life/tasks/streak?date=${todayStr}`, { cache: 'no-store' }).then(safeJson<{ streak: number }>).then(d => setTaskStreak(d.streak ?? 0)).catch(() => {})
  }, [todayStr, tomorrowStr])

  useEffect(() => {
    const n = new Date()
    fetch(`/api/dashboard?day=${n.getDate()}`, { cache: 'no-store' }).then(safeJson<DashboardData>).then(setData).catch(() => {})
    fetch('/api/life/day-scores?days=7', { cache: 'no-store' }).then(safeJson<DayScores>).then(setDayScores).catch(() => {})
    fetch('/api/finance/accounts', { cache: 'no-store' }).then(safeJson<AccountRow[]>).then(setAccounts).catch(() => {})
    fetch(`/api/life/water?date=${todayStr}`, { cache: 'no-store' }).then(safeJson<WaterLogRow[]>).then(setWaterLogs).catch(() => {})
    loadRightNow()
    loadCatchUp()
    loadTasks()
  }, [loadRightNow, loadCatchUp, loadTasks, todayStr])

  async function toggleHabit(habitId: string) {
    setJustDone(prev => new Set(prev).add(habitId))
    try {
      const res = await fetch('/api/life/logs', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ habitId, date: todayStr + 'T12:00:00.000Z', completed: true }),
      })
      if (!res.ok) throw new Error()
      setTimeout(() => { loadRightNow(); loadCatchUp() }, 700)
    } catch {
      toast.error("Couldn't save that — try again")
      setJustDone(prev => { const n = new Set(prev); n.delete(habitId); return n })
    }
  }

  async function catchUpHabit(habitId: string) {
    setCatchDone(prev => new Set(prev).add(habitId))
    try {
      const res = await fetch('/api/life/logs', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ habitId, date: todayStr + 'T12:00:00.000Z', completed: true }),
      })
      if (!res.ok) throw new Error()
      setTimeout(() => { loadCatchUp(); loadRightNow() }, 800)
    } catch {
      toast.error("Couldn't save that — try again")
      setCatchDone(prev => { const n = new Set(prev); n.delete(habitId); return n })
    }
  }

  async function logMeal(mealType: string, description: string | null) {
    setCatchUp(prev => prev ? { ...prev, unloggedMeals: prev.unloggedMeals.filter(m => m.mealType !== mealType) } : prev)
    try {
      const res = await fetch('/api/life/meal-log', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: todayStr, mealType, description }),
      })
      if (!res.ok) throw new Error()
      setTimeout(loadRightNow, 400)
    } catch {
      toast.error("Couldn't save that — try again")
      loadCatchUp()
    }
  }

  async function markNoExpenses() {
    setCatchUp(prev => prev ? { ...prev, noExpenses: true } : prev)
    try {
      const res = await fetch('/api/life/catch-up', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: todayStr, action: 'no-expenses' }),
      })
      if (!res.ok) throw new Error()
    } catch {
      toast.error("Couldn't save that — try again")
      loadCatchUp()
    }
  }

  async function addTask(date: string, text: string) {
    if (!text.trim()) return
    try {
      const res = await fetch('/api/life/tasks', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, text: text.trim() }),
      })
      if (!res.ok) throw new Error()
      const created = await res.json()
      if (date === todayStr) setTodayTasks(prev => [...(prev ?? []), created])
      else setTomorrowTasks(prev => [...(prev ?? []), created])
    } catch {
      toast.error("Couldn't save that — try again")
    }
  }

  async function toggleTask(id: string) {
    setTaskJustDone(prev => new Set(prev).add(id))
    try {
      const res = await fetch('/api/life/tasks', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, completed: true }),
      })
      if (!res.ok) throw new Error()
      setTimeout(loadTasks, 800)
    } catch {
      toast.error("Couldn't save that — try again")
      setTaskJustDone(prev => { const n = new Set(prev); n.delete(id); return n })
    }
  }

  async function logWater(drink: string, volumeMl: number) {
    try {
      const res = await fetch('/api/life/water', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: todayStr, drink, volumeMl }),
      })
      if (!res.ok) throw new Error()
      const created = await res.json()
      setWaterLogs(prev => [...(prev ?? []), created])
    } catch {
      toast.error("Couldn't save that — try again")
    }
  }

  return {
    data, rightNow, dayScores, agenda, accounts, catchUp, todayTasks, tomorrowTasks, taskStreak, waterLogs,
    justDone, taskJustDone, catchDone, todayStr, tomorrowStr,
    toggleHabit, catchUpHabit, logMeal, markNoExpenses, addTask, toggleTask, logWater,
  }
}
