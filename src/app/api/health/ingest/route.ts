export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// A handful of renames purely for readability where we already reference
// these keys elsewhere (steps, sleepHours, etc). Anything not listed here
// passes through under its raw Health Auto Export name unchanged — this
// endpoint accepts every metric HealthKit can report, not a fixed list.
const ALIASES: Record<string, string> = {
  step_count: 'steps',
  active_energy: 'activeEnergy',
  apple_exercise_time: 'exerciseMin',
  resting_heart_rate: 'restingHR',
  heart_rate_variability: 'hrv',
  weight_body_mass: 'weight',
  body_mass: 'weight',
}

// Metrics that accumulate over the day (counts, distances, durations,
// energy) should be summed when multiple readings land on the same day;
// everything else (rates, percentages, point-in-time vitals) defaults to
// an average, which is the safer guess for the ~90 metric names we don't
// special-case by hand.
const CUMULATIVE_HINTS = ['count', 'steps', 'distance', 'energy', 'flights', 'time', 'sleep', 'walking', 'running', 'stand', 'exercise']
function combineFor(metric: string): 'sum' | 'avg' {
  const m = metric.toLowerCase()
  if (m === 'weight' || m.includes('mass') || m.includes('percentage') || m.includes('rate') && !m.includes('respiratory')) return 'avg'
  return CUMULATIVE_HINTS.some(h => m.includes(h)) ? 'sum' : 'avg'
}

type Reading = { metric: string; date: string; value: number }

function localDayKey(dateStr: string): string {
  // Accepts "2026-07-14 00:00:00 +0000" (Health Auto Export) or ISO —
  // we only care about the calendar day, in local time.
  const d = new Date(dateStr.replace(' ', 'T').replace(/\s*\+\d{4}$/, 'Z'))
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// A single Health Auto Export data row is usually { date, qty } or
// { date, Avg/Min/Max }. Multi-stage metrics like sleep_analysis instead
// carry several named numeric fields (asleep, core, deep, rem, inBed,
// awake) with no single "qty" — those get split into one reading per
// sub-field so nothing gets silently dropped.
const NON_VALUE_KEYS = new Set(['date', 'source', 'units', 'unit'])
function extractValues(metricName: string, row: Record<string, any>): { metric: string; value: number }[] {
  for (const key of ['qty', 'value', 'Avg', 'avg']) {
    if (typeof row[key] === 'number') return [{ metric: metricName, value: row[key] }]
  }
  const numericFields = Object.entries(row).filter(([k, v]) => !NON_VALUE_KEYS.has(k) && typeof v === 'number')
  if (numericFields.length === 1) return [{ metric: metricName, value: numericFields[0][1] as number }]
  return numericFields.map(([k, v]) => ({ metric: `${metricName}.${k}`, value: v as number }))
}

function normalize(body: any): Reading[] {
  const out: Reading[] = []

  // Health Auto Export REST-API export shape
  if (body?.data?.metrics) {
    for (const m of body.data.metrics) {
      const metricName = ALIASES[m.name] ?? m.name
      for (const row of m.data ?? []) {
        if (!row.date) continue
        for (const { metric, value } of extractValues(metricName, row)) {
          out.push({ metric, date: row.date, value })
        }
      }
    }
    return out
  }

  // Simple custom shape for a manual iOS Shortcut: { metrics: [{ metric, date, value }] }
  if (Array.isArray(body?.metrics)) {
    for (const row of body.metrics) {
      if (typeof row.value !== 'number' || !row.date || !row.metric) continue
      out.push({ metric: ALIASES[row.metric] ?? row.metric, date: row.date, value: row.value })
    }
  }
  return out
}

export async function POST(req: NextRequest) {
  const secret = process.env.HEALTH_INGEST_SECRET
  if (!secret) return NextResponse.json({ error: 'HEALTH_INGEST_SECRET not configured' }, { status: 500 })

  const auth = req.headers.get('authorization') ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : req.nextUrl.searchParams.get('token')
  if (token !== secret) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const readings = normalize(body)
  if (readings.length === 0) return NextResponse.json({ ingested: 0 })

  // Group by (day, metric) so a source that sends per-sample data collapses
  // to one row per day per metric.
  const groups = new Map<string, { metric: string; day: string; values: number[] }>()
  for (const r of readings) {
    const day = localDayKey(r.date)
    const gkey = `${day}:${r.metric}`
    if (!groups.has(gkey)) groups.set(gkey, { metric: r.metric, day, values: [] })
    groups.get(gkey)!.values.push(r.value)
  }

  let ingested = 0
  for (const g of Array.from(groups.values())) {
    const combine = combineFor(g.metric)
    const value = combine === 'sum' ? g.values.reduce((s, v) => s + v, 0)
      : g.values.reduce((s, v) => s + v, 0) / g.values.length
    await prisma.healthMetric.upsert({
      where: { date_metric: { date: new Date(g.day + 'T00:00:00.000Z'), metric: g.metric } },
      create: { date: new Date(g.day + 'T00:00:00.000Z'), metric: g.metric, value },
      update: { value },
    })
    ingested++
  }

  return NextResponse.json({ ingested, metrics: Array.from(new Set(Array.from(groups.values()).map(g => g.metric))) })
}
