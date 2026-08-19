import { prisma } from '@/lib/prisma'

// ── Cross-module patterns ─────────────────────────────────────────────────
// Nothing in the app connects modules to each other today — every mascot
// nudge and every finance signal is an independent single-module check.
// This is the one place that actually looks across them: personal spending,
// workouts, habit completion, and mood, bucketed by week. Deliberately
// conservative — only reports a finding when both buckets being compared
// have at least a couple of weeks of data AND the gap is large enough
// (≥15% for money, ≥0.4/5 for mood) to be worth mentioning; a handful of
// noisy weeks shouldn't read as a confident claim. Shared by the Home
// "Patterns" card and one mascot nudge, computed once, not twice.

export interface PatternFinding {
  id: string
  text: string
}

const MOOD_SCORE: Record<string, number> = { '😞': 1, '😕': 2, '😐': 3, '🙂': 4, '😄': 5 }
const NUM_WEEKS = 10

function mondayOf(d: Date): Date {
  const utc = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const day = utc.getUTCDay() // 0=Sun..6=Sat
  utc.setUTCDate(utc.getUTCDate() + (day === 0 ? -6 : 1 - day))
  return utc
}

interface WeekStats { spendRSD: number; workouts: number; habitDone: number; habitTotal: number; moodSum: number; moodCount: number }

function bucketCompare(pool: WeekStats[], inBucket: (w: WeekStats) => boolean, metric: (w: WeekStats) => number) {
  const hi = pool.filter(inBucket)
  const lo = pool.filter(w => !inBucket(w))
  if (hi.length < 2 || lo.length < 2) return null
  const avg = (arr: WeekStats[]) => arr.reduce((s, w) => s + metric(w), 0) / arr.length
  return { hiAvg: avg(hi), loAvg: avg(lo), hiN: hi.length, loN: lo.length }
}

export async function computePatterns(): Promise<PatternFinding[]> {
  const rangeEnd = mondayOf(new Date()) // exclude the current, still-in-progress week
  const rangeStart = new Date(rangeEnd)
  rangeStart.setUTCDate(rangeStart.getUTCDate() - NUM_WEEKS * 7)

  const [expenses, workouts, habitLogs, dailyLogs] = await Promise.all([
    prisma.expenseEntry.findMany({ where: { type: 'personal', date: { gte: rangeStart, lt: rangeEnd } }, select: { date: true, amountRSD: true } }),
    prisma.workoutLog.findMany({ where: { type: { not: 'rest' }, date: { gte: rangeStart, lt: rangeEnd } }, select: { date: true } }),
    prisma.habitLog.findMany({ where: { date: { gte: rangeStart, lt: rangeEnd } }, select: { date: true, completed: true } }),
    prisma.dailyLog.findMany({ where: { date: { gte: rangeStart, lt: rangeEnd }, mood: { not: null } }, select: { date: true, mood: true } }),
  ])

  const weeks: WeekStats[] = Array.from({ length: NUM_WEEKS }, () => ({ spendRSD: 0, workouts: 0, habitDone: 0, habitTotal: 0, moodSum: 0, moodCount: 0 }))
  const weekIndex = (d: Date) => Math.floor((mondayOf(d).getTime() - rangeStart.getTime()) / (7 * 86400000))

  for (const e of expenses) { const i = weekIndex(e.date); if (weeks[i]) weeks[i].spendRSD += e.amountRSD }
  for (const w of workouts) { const i = weekIndex(w.date); if (weeks[i]) weeks[i].workouts++ }
  for (const h of habitLogs) { const i = weekIndex(h.date); if (weeks[i]) { weeks[i].habitTotal++; if (h.completed) weeks[i].habitDone++ } }
  for (const d of dailyLogs) {
    const score = MOOD_SCORE[d.mood!]
    if (!score) continue
    const i = weekIndex(d.date)
    if (weeks[i]) { weeks[i].moodSum += score; weeks[i].moodCount++ }
  }

  const withHabits = weeks.filter(w => w.habitTotal >= 5) // enough logged that week to trust the rate
  const withMood = weeks.filter(w => w.moodCount >= 3)
  const findings: PatternFinding[] = []

  // Spend vs. workouts
  {
    const r = bucketCompare(weeks, w => w.workouts >= 3, w => w.spendRSD)
    if (r && r.loAvg > 0) {
      const pctDiff = (r.loAvg - r.hiAvg) / r.loAvg * 100
      if (Math.abs(pctDiff) >= 15) {
        findings.push({
          id: 'spend-vs-workouts',
          text: `Personal spending is ~${Math.round(Math.abs(pctDiff))}% ${pctDiff > 0 ? 'lower' : 'higher'} in weeks with 3+ workouts `
            + `(${Math.round(r.hiAvg).toLocaleString()} vs ${Math.round(r.loAvg).toLocaleString()} RSD) — last ${weeks.length} weeks.`,
        })
      }
    }
  }

  // Spend vs. habit completion
  if (withHabits.length >= 4) {
    const r = bucketCompare(withHabits, w => w.habitDone / w.habitTotal >= 0.75, w => w.spendRSD)
    if (r && r.loAvg > 0) {
      const pctDiff = (r.loAvg - r.hiAvg) / r.loAvg * 100
      if (Math.abs(pctDiff) >= 15) {
        findings.push({
          id: 'spend-vs-habits',
          text: `Personal spending is ~${Math.round(Math.abs(pctDiff))}% ${pctDiff > 0 ? 'lower' : 'higher'} in weeks with 75%+ habit completion `
            + `— last ${withHabits.length} weeks with enough habit data.`,
        })
      }
    }
  }

  // Mood vs. habit completion
  if (withMood.length >= 4) {
    const pool = withMood.filter(w => w.habitTotal > 0)
    const r = bucketCompare(pool, w => w.habitDone / w.habitTotal >= 0.75, w => w.moodSum / w.moodCount)
    if (r) {
      const diff = r.hiAvg - r.loAvg
      if (Math.abs(diff) >= 0.4) {
        findings.push({
          id: 'mood-vs-habits',
          text: `Mood runs ${diff > 0 ? 'higher' : 'lower'} in weeks with 75%+ habit completion `
            + `(avg ${r.hiAvg.toFixed(1)}/5 vs ${r.loAvg.toFixed(1)}/5) — last ${pool.length} weeks with mood + habit data.`,
        })
      }
    }
  }

  return findings
}
