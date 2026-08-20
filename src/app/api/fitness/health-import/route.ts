export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { classifyFromHealthKitType } from '@/lib/workoutType'

// ── Apple Health import ───────────────────────────────────────────────────
// There's no public API for HealthKit — Apple only exposes it on-device —
// so the only realistic bridge into a web app is a Shortcuts Automation
// running on the phone itself, posting here once a day (or once per
// metric/workout — see below). That's also why this route can't use the
// normal PIN session: a Shortcut can't do an interactive login, so it
// authenticates with a static key instead (HEALTH_IMPORT_KEY, set directly
// in Vercel — never checked into git).
//
// Scalar vitals (weight/steps/active-energy/sleep-total/HRV/RHR/respiratory/
// SpO2/wrist-temp/VO2max/HR-recovery) all reuse BodyMetric (one row per day
// per metric, via the existing date+metric unique constraint) instead of new
// tables — "metric" was already a free-form string, so these are just new
// accepted values for it, no schema migration needed. Every metric key this
// route recognizes is registered once in src/lib/metrics.ts.
//
// Workouts are one call per workout (send the request again for a second
// workout the same day) rather than an array, to keep the payload — and the
// Shortcut that builds it — as simple as possible. Chaining multiple "Find
// Health Samples" actions before one shared POST breaks in Shortcuts (the
// second auto-converts to "Filter Health Samples" and filters the first
// metric's result instead of querying fresh) — so every metric/workout/sleep
// call is meant to be its own self-contained Find-then-POST pair, never
// chained, even though that means more calls per day.
//
// Sleep is the one genuinely multi-value shape (a night has many stage
// segments, not one number). Two ways in:
//   - Nightly totals (sleepInBedMin/sleepAsleepMin/etc) — what the Shortcut
//     sends, upserted straight onto one SleepSession row.
//   - sleepSegments[] — a raw {stage,startAt,endAt}[] array, only realistic
//     from real code (the Scriptable export-parser), not hand-built in the
//     Shortcuts UI. When present, THIS SERVER aggregates stage durations and
//     overwrites the derived minute columns — never trust client arithmetic
//     when the raw segments are available.

// Accepts a clean "YYYY-MM-DD" (what the Scriptable export-parser sends) or
// whatever raw string Shortcuts' un-formatted Current Date variable
// produces when dropped straight into a text field — a Format Date action
// shouldn't be a precondition for this to work. Tried a plain `new
// Date(raw)` for that case first; JS's native parser turned out to choke
// outright on the literal word "at" in "August 20, 2026 at 12:10 AM" (an
// actual format Shortcuts produces), so long-month-name and dotted
// day.month.year (the Serbian date format) are matched explicitly before
// falling back to native parsing for anything else. Either way, only the
// CALENDAR DAY matters (this is a once-a-day import) — the exact time of
// day gets discarded and re-anchored to UTC midnight of whichever day the
// string represents.
const MONTH_NAMES = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']

function parseImportDate(raw: string): Date | null {
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) {
    const d = new Date(Date.UTC(+iso[1], +iso[2] - 1, +iso[3]))
    return Number.isNaN(d.getTime()) ? null : d
  }

  const named = raw.toLowerCase().match(/(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2}),?\s+(\d{4})/)
  if (named) {
    const d = new Date(Date.UTC(+named[3], MONTH_NAMES.indexOf(named[1]), +named[2]))
    return Number.isNaN(d.getTime()) ? null : d
  }

  const dotted = raw.match(/^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})\.?/) // D. M. YYYY (Serbian phone locale, may have spaces after each dot)
  if (dotted) {
    const d = new Date(Date.UTC(+dotted[3], +dotted[2] - 1, +dotted[1]))
    return Number.isNaN(d.getTime()) ? null : d
  }

  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return null
  return new Date(Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()))
}

// bedTime/wakeTime keep their actual time-of-day (unlike `date` above), so
// they need a real datetime parse, not the calendar-day-only one. Kept
// permissive but simple — a bad/missing value just means we skip storing it,
// it doesn't block the rest of the sleep import.
function parseImportDateTime(raw: unknown): Date | null {
  if (typeof raw !== 'string' || !raw.trim()) return null
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? null : d
}

// Payload key -> BodyMetric.metric. `weightKg` stays irregular (the payload
// key predates metrics.ts and an already-working Shortcut depends on it);
// every metric added since just uses its own metrics.ts key directly.
const SCALAR_FIELDS: { key: string; metric: string }[] = [
  { key: 'weightKg', metric: 'weight' },
  { key: 'steps', metric: 'steps' },
  { key: 'activeEnergyKcal', metric: 'activeEnergyKcal' },
  { key: 'sleepHours', metric: 'sleepHours' },
  { key: 'respiratoryRate', metric: 'respiratoryRate' },
  { key: 'hrvSDNN', metric: 'hrvSDNN' },
  { key: 'restingHeartRate', metric: 'restingHeartRate' },
  { key: 'spo2', metric: 'spo2' },
  { key: 'wristTemp', metric: 'wristTemp' },
  { key: 'vo2Max', metric: 'vo2Max' },
  { key: 'hrRecovery1min', metric: 'hrRecovery1min' },
]

const SLEEP_MINUTE_FIELDS = ['sleepInBedMin', 'sleepAsleepMin', 'sleepRemMin', 'sleepCoreMin', 'sleepDeepMin', 'sleepAwakeMin'] as const

interface SleepSegmentInput { stage: string; startAt: string; endAt: string }

function aggregateSleepSegments(segments: SleepSegmentInput[]) {
  let inBedMin = 0, asleepMin = 0, remMin = 0, coreMin = 0, deepMin = 0, awakeMin = 0
  let bedTime: Date | null = null, wakeTime: Date | null = null
  const valid = segments
    .map(s => ({ stage: s.stage, start: new Date(s.startAt), end: new Date(s.endAt) }))
    .filter(s => !Number.isNaN(s.start.getTime()) && !Number.isNaN(s.end.getTime()) && s.end > s.start)

  for (const s of valid) {
    const min = (s.end.getTime() - s.start.getTime()) / 60000
    if (bedTime === null || s.start < bedTime) bedTime = s.start
    if (wakeTime === null || s.end > wakeTime) wakeTime = s.end
    switch (s.stage) {
      case 'inBed': inBedMin += min; break
      case 'awake': awakeMin += min; break
      case 'asleepREM': remMin += min; asleepMin += min; break
      case 'asleepCore': coreMin += min; asleepMin += min; break
      case 'asleepDeep': deepMin += min; asleepMin += min; break
      case 'asleepUnspecified': asleepMin += min; break
    }
  }
  // Older exports/devices don't send a separate "inBed" segment at all —
  // fall back to the tracked span (asleep + awake interruptions).
  if (inBedMin === 0) inBedMin = asleepMin + awakeMin

  return { inBedMin, asleepMin, remMin, coreMin, deepMin, awakeMin, bedTime, wakeTime }
}

export async function POST(req: NextRequest) {
  const key = req.headers.get('x-api-key')
  if (!process.env.HEALTH_IMPORT_KEY || key !== process.env.HEALTH_IMPORT_KEY) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  if (!body || typeof body.date !== 'string') {
    return NextResponse.json({ error: 'date is required, e.g. "date": "2026-08-20"' }, { status: 400 })
  }
  const date = parseImportDate(body.date)
  if (!date) {
    return NextResponse.json({ error: 'invalid date — send "YYYY-MM-DD" or any date string, e.g. straight from a Current Date variable' }, { status: 400 })
  }

  const imported: string[] = []

  for (const f of SCALAR_FIELDS) {
    const v = body[f.key]
    if (typeof v === 'number' && Number.isFinite(v)) {
      await prisma.bodyMetric.upsert({
        where: { date_metric: { date, metric: f.metric } },
        update: { value: v },
        create: { date, metric: f.metric, value: v },
      })
      imported.push(f.metric)
    }
  }

  if (typeof body.workoutType === 'string' && body.workoutType.trim()) {
    const workoutData = {
      date,
      type: classifyFromHealthKitType(body.workoutType),
      duration: typeof body.workoutDurationMin === 'number' ? Math.round(body.workoutDurationMin) : null,
      notes: [
        body.workoutType,
        typeof body.workoutCalories === 'number' ? `${Math.round(body.workoutCalories)} kcal` : null,
      ].filter(Boolean).join(' · ') || null,
      avgHeartRate: typeof body.workoutAvgHeartRate === 'number' ? Math.round(body.workoutAvgHeartRate) : null,
      maxHeartRate: typeof body.workoutMaxHeartRate === 'number' ? Math.round(body.workoutMaxHeartRate) : null,
      calories: typeof body.workoutCalories === 'number' ? Math.round(body.workoutCalories) : null,
      rawActivityType: typeof body.workoutRawType === 'string' ? body.workoutRawType : body.workoutType,
      source: 'apple_health' as const,
    }
    if (typeof body.workoutExternalId === 'string' && body.workoutExternalId.trim()) {
      await prisma.workoutLog.upsert({
        where: { externalId: body.workoutExternalId },
        update: workoutData,
        create: { ...workoutData, externalId: body.workoutExternalId },
      })
    } else {
      await prisma.workoutLog.create({ data: workoutData })
    }
    imported.push('workout')
  }

  // Nightly sleep totals → one SleepSession per date.
  const hasSleepTotals = SLEEP_MINUTE_FIELDS.some(f => typeof body[f] === 'number')
  if (hasSleepTotals) {
    await prisma.sleepSession.upsert({
      where: { date },
      update: {
        inBedMin: body.sleepInBedMin ?? undefined,
        asleepMin: body.sleepAsleepMin ?? undefined,
        remMin: body.sleepRemMin ?? undefined,
        coreMin: body.sleepCoreMin ?? undefined,
        deepMin: body.sleepDeepMin ?? undefined,
        awakeMin: body.sleepAwakeMin ?? undefined,
        bedTime: parseImportDateTime(body.sleepBedTime) ?? undefined,
        wakeTime: parseImportDateTime(body.sleepWakeTime) ?? undefined,
      },
      create: {
        date,
        inBedMin: body.sleepInBedMin ?? null,
        asleepMin: body.sleepAsleepMin ?? null,
        remMin: body.sleepRemMin ?? null,
        coreMin: body.sleepCoreMin ?? null,
        deepMin: body.sleepDeepMin ?? null,
        awakeMin: body.sleepAwakeMin ?? null,
        bedTime: parseImportDateTime(body.sleepBedTime),
        wakeTime: parseImportDateTime(body.sleepWakeTime),
      },
    })
    imported.push('sleepTotals')
  }

  // Raw sleep segments (Scriptable backfill path) — server aggregates and
  // overwrites the derived totals above, since raw data beats client math.
  if (Array.isArray(body.sleepSegments) && body.sleepSegments.length > 0) {
    const agg = aggregateSleepSegments(body.sleepSegments)
    const session = await prisma.sleepSession.upsert({
      where: { date },
      update: {
        inBedMin: agg.inBedMin, asleepMin: agg.asleepMin, remMin: agg.remMin,
        coreMin: agg.coreMin, deepMin: agg.deepMin, awakeMin: agg.awakeMin,
        bedTime: agg.bedTime, wakeTime: agg.wakeTime,
      },
      create: {
        date, inBedMin: agg.inBedMin, asleepMin: agg.asleepMin, remMin: agg.remMin,
        coreMin: agg.coreMin, deepMin: agg.deepMin, awakeMin: agg.awakeMin,
        bedTime: agg.bedTime, wakeTime: agg.wakeTime,
      },
    })
    await prisma.sleepSegment.deleteMany({ where: { sessionId: session.id } })
    await prisma.sleepSegment.createMany({
      data: body.sleepSegments
        .map((s: SleepSegmentInput) => ({ sessionId: session.id, stage: s.stage, startAt: new Date(s.startAt), endAt: new Date(s.endAt) }))
        .filter((s: { startAt: Date; endAt: Date }) => !Number.isNaN(s.startAt.getTime()) && !Number.isNaN(s.endAt.getTime())),
    })
    imported.push('sleepSegments')
  }

  if (imported.length === 0) {
    return NextResponse.json({ error: 'nothing recognized in the payload — checked scalar vitals, workoutType, sleep totals, and sleepSegments' }, { status: 400 })
  }

  return NextResponse.json({ ok: true, imported })
}

// Temporary — clears the synthetic test vitals/sleep/workout data posted
// while verifying vitals.ts's scoring math, so it doesn't pollute the real
// baseline once actual Apple Health data starts flowing in. Remove after running once.
export async function DELETE(req: NextRequest) {
  const key = req.headers.get('x-api-key')
  if (!process.env.HEALTH_IMPORT_KEY || key !== process.env.HEALTH_IMPORT_KEY) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const metrics = await prisma.bodyMetric.deleteMany({ where: { metric: { in: ['hrvSDNN', 'restingHeartRate', 'respiratoryRate'] } } })
  const sleep = await prisma.sleepSession.deleteMany({})
  const workouts = await prisma.workoutLog.deleteMany({ where: { source: 'apple_health' } })
  return NextResponse.json({ deletedMetrics: metrics.count, deletedSleep: sleep.count, deletedWorkouts: workouts.count })
}

// Read-only check, same static key — lets me confirm what actually landed
// after a real Shortcuts run while the rest of the metrics get wired up.
export async function GET(req: NextRequest) {
  const key = req.headers.get('x-api-key')
  if (!process.env.HEALTH_IMPORT_KEY || key !== process.env.HEALTH_IMPORT_KEY) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const metrics = await prisma.bodyMetric.findMany({ orderBy: { date: 'desc' }, take: 15 })
  const workouts = await prisma.workoutLog.findMany({ orderBy: { date: 'desc' }, take: 5 })
  const sleep = await prisma.sleepSession.findMany({ orderBy: { date: 'desc' }, take: 5 })
  return NextResponse.json({ metrics, workouts, sleep })
}
