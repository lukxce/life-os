export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// ── Apple Health import ───────────────────────────────────────────────────
// There's no public API for HealthKit — Apple only exposes it on-device —
// so the only realistic bridge into a web app is a Shortcuts Automation
// running on the phone itself, posting here once a day. That's also why
// this route can't use the normal PIN session: a Shortcut can't do an
// interactive login, so it authenticates with a static key instead
// (HEALTH_IMPORT_KEY, set directly in Vercel — never checked into git).
//
// Weight/steps/active-energy/sleep all reuse BodyMetric (already one
// row per day per metric, via the existing date+metric unique constraint)
// instead of new tables — "metric" was already a free-form string, so
// these are just new accepted values for it, no schema migration needed.
// Workouts are one call per workout (send the request again for a second
// workout the same day) rather than an array, to keep the payload — and
// the Shortcut that builds it — as simple as possible.

function mapWorkoutType(raw: string): string {
  const s = raw.toLowerCase()
  if (s.includes('strength') || s.includes('functional') || s.includes('core') || s.includes('weight training')) return 'pt'
  if (s.includes('cycl') || s.includes('bike') || s.includes('spin')) return 'cardio_bike'
  if (s.includes('run') || s.includes('walk') || s.includes('swim') || s.includes('elliptical') || s.includes('row') || s.includes('hiit') || s.includes('cardio') || s.includes('dance') || s.includes('hik')) return 'cardio_other'
  return 'other'
}

const SCALAR_FIELDS: { key: string; metric: string }[] = [
  { key: 'weightKg', metric: 'weight' },
  { key: 'steps', metric: 'steps' },
  { key: 'activeEnergyKcal', metric: 'activeEnergyKcal' },
  { key: 'sleepHours', metric: 'sleepHours' },
]

export async function POST(req: NextRequest) {
  const key = req.headers.get('x-api-key')
  if (!process.env.HEALTH_IMPORT_KEY || key !== process.env.HEALTH_IMPORT_KEY) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  if (!body || typeof body.date !== 'string') {
    return NextResponse.json({ error: 'date is required, e.g. "date": "2026-08-20"' }, { status: 400 })
  }
  const date = new Date(`${body.date}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) {
    return NextResponse.json({ error: 'invalid date' }, { status: 400 })
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
    await prisma.workoutLog.create({
      data: {
        date,
        type: mapWorkoutType(body.workoutType),
        duration: typeof body.workoutDurationMin === 'number' ? Math.round(body.workoutDurationMin) : null,
        notes: [
          body.workoutType,
          typeof body.workoutCalories === 'number' ? `${Math.round(body.workoutCalories)} kcal` : null,
        ].filter(Boolean).join(' · ') || null,
      },
    })
    imported.push('workout')
  }

  if (imported.length === 0) {
    return NextResponse.json({ error: 'nothing recognized in the payload — checked for weightKg, steps, activeEnergyKcal, sleepHours, workoutType' }, { status: 400 })
  }

  return NextResponse.json({ ok: true, imported })
}
