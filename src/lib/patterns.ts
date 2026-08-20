import { prisma } from '@/lib/prisma'
import { computeRecovery, computeSleepScore, type RecoveryResult } from '@/lib/vitals'

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

  findings.push(...await computeJournalCorrelations())

  return findings
}

// ── Journal-event correlations ──────────────────────────────────────────────
// Day-bucketed (not week-bucketed like everything above) — does a manually-
// tagged JournalEvent ("alcohol", "shared_bed", ...) predict next-morning
// Recovery/Sleep? Bounded hard on cost: computeRecovery/computeSleepScore
// each do several DB queries, and this runs on every Home load via
// computePatterns(), so both the event-types considered and the "without"
// control-group sample are capped regardless of how far back the lookback
// window goes — this is NOT the place for an exhaustive scan.

const JOURNAL_LOOKBACK_DAYS = 60
const MIN_EVENT_NIGHTS = 3
const MAX_CONTROL_SAMPLE = 15

function isoDay(d: Date) { return d.toISOString().slice(0, 10) }
function nextDayIso(d: Date) { const n = new Date(d); n.setUTCDate(n.getUTCDate() + 1); return isoDay(n) }

async function computeJournalCorrelations(): Promise<PatternFinding[]> {
  const findings: PatternFinding[] = []
  const end = new Date(); end.setUTCHours(0, 0, 0, 0)
  const start = new Date(end); start.setUTCDate(start.getUTCDate() - JOURNAL_LOOKBACK_DAYS)

  const events = await prisma.journalEvent.findMany({ where: { date: { gte: start, lt: end } }, select: { date: true, type: true } })
  if (events.length === 0) return findings

  const byType = new Map<string, Date[]>()
  for (const e of events) {
    if (!byType.has(e.type)) byType.set(e.type, [])
    byType.get(e.type)!.push(e.date)
  }
  const qualifying = Array.from(byType.entries()).filter(([, dates]) => dates.length >= MIN_EVENT_NIGHTS)
  if (qualifying.length === 0) return findings

  const eventDaySet = new Set(events.map(e => isoDay(e.date)))
  const nonEventDays: Date[] = []
  for (let d = new Date(start); d < end && nonEventDays.length < MAX_CONTROL_SAMPLE; d.setUTCDate(d.getUTCDate() + 1)) {
    if (!eventDaySet.has(isoDay(d))) nonEventDays.push(new Date(d))
  }
  if (nonEventDays.length < MIN_EVENT_NIGHTS) return findings

  for (const [type, dates] of qualifying) {
    const [withRecovery, withoutRecovery] = await Promise.all([
      Promise.all(dates.map(d => computeRecovery(nextDayIso(d)))),
      Promise.all(nonEventDays.map(d => computeRecovery(nextDayIso(d)))),
    ])
    const withOk = withRecovery.filter((r): r is RecoveryResult => r.status === 'ok')
    const withoutOk = withoutRecovery.filter((r): r is RecoveryResult => r.status === 'ok')
    if (withOk.length >= MIN_EVENT_NIGHTS && withoutOk.length >= MIN_EVENT_NIGHTS) {
      const withAvg = withOk.reduce((s, r) => s + r.score, 0) / withOk.length
      const withoutAvg = withoutOk.reduce((s, r) => s + r.score, 0) / withoutOk.length
      const diff = withoutAvg - withAvg
      if (Math.abs(diff) >= 5) {
        findings.push({
          id: `journal-${type}-recovery`,
          text: `Nights with "${type}" logged are followed by ~${Math.round(Math.abs(diff))}% ${diff > 0 ? 'lower' : 'higher'} recovery the next morning `
            + `(${Math.round(withAvg)}% vs ${Math.round(withoutAvg)}%) — ${withOk.length} nights with data.`,
        })
      }
    }

    const [withSleep, withoutSleep] = await Promise.all([
      Promise.all(dates.map(d => computeSleepScore(nextDayIso(d)))),
      Promise.all(nonEventDays.map(d => computeSleepScore(nextDayIso(d)))),
    ])
    const withSleepOk = withSleep.filter((s): s is NonNullable<typeof s> => s !== null)
    const withoutSleepOk = withoutSleep.filter((s): s is NonNullable<typeof s> => s !== null)
    if (withSleepOk.length >= MIN_EVENT_NIGHTS && withoutSleepOk.length >= MIN_EVENT_NIGHTS) {
      const withAvg = withSleepOk.reduce((s, r) => s + r.score, 0) / withSleepOk.length
      const withoutAvg = withoutSleepOk.reduce((s, r) => s + r.score, 0) / withoutSleepOk.length
      const diff = withoutAvg - withAvg
      if (Math.abs(diff) >= 5) {
        findings.push({
          id: `journal-${type}-sleep`,
          text: `Nights with "${type}" logged score ~${Math.round(Math.abs(diff))}% ${diff > 0 ? 'lower' : 'higher'} on sleep `
            + `(${Math.round(withAvg)}% vs ${Math.round(withoutAvg)}%) — ${withSleepOk.length} nights with data.`,
        })
      }
    }
  }

  return findings
}
