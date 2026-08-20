export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isScheduledDay, utcMidnight } from '@/lib/utils'
import { computeVitals } from '@/lib/vitals'

// Everything except mood/notes is computed fresh from the tables that
// already track it — never duplicated into DailyLog itself.
async function buildSummary(date: Date) {
  const dayEnd = new Date(date); dayEnd.setUTCHours(23, 59, 59, 999)

  const [habits, waterLogs, mealLogs, tasks, expenseCount, workouts] = await Promise.all([
    prisma.habit.findMany({
      where: { active: true, paused: false, category: { not: 'Weekly Check-in' } },
      include: { logs: { where: { date }, select: { completed: true } } },
    }),
    prisma.waterLog.findMany({ where: { date, drink: 'Water' } }),
    prisma.mealLog.findMany({ where: { date } }),
    prisma.dailyTask.findMany({ where: { date } }),
    prisma.expenseEntry.count({ where: { date: { gte: date, lte: dayEnd } } }),
    prisma.workoutLog.findMany({ where: { date: { gte: date, lte: dayEnd } } }),
  ])

  const dueToday = habits.filter(h => isScheduledDay(h, date))
  const habitsDone = dueToday.filter(h => h.logs[0]?.completed).length

  return {
    habitsDone,
    habitsTotal: dueToday.length,
    habitNames: dueToday.filter(h => h.logs[0]?.completed).map(h => h.name),
    waterMl: waterLogs.reduce((s, w) => s + w.volumeMl, 0),
    mealsLogged: mealLogs.filter(m => m.description).length,
    mealsSkipped: mealLogs.filter(m => !m.description).length,
    mealDescriptions: mealLogs.filter(m => m.description).map(m => m.description as string),
    tasksDone: tasks.filter(t => t.completed).length,
    tasksTotal: tasks.length,
    expensesLogged: expenseCount,
    workoutsLogged: workouts.length,
    workoutDetails: workouts.map(w => ({ type: w.type, duration: w.duration, avgHeartRate: w.avgHeartRate })),
  }
}

// Auto-narrative: one Haiku call per day, only for a day that's already
// over (not today — the day isn't finished, there's nothing to narrate
// yet), only when it hasn't been generated before. Same raw-fetch pattern
// as estimateNutrition() in api/life/meal-log/route.ts — same cost tier,
// this is a short per-day paragraph, not the weekly digest's bigger job.
// Also deduces JournalEvent tags from the day's meal text ("wine with
// dinner" -> "alcohol") — old auto-source tags for the date are cleared
// and replaced each generation so a manual "regenerate" doesn't pile up
// duplicates; manual (user-added) tags are never touched.
async function generateNarrative(dateStr: string, date: Date, summary: Awaited<ReturnType<typeof buildSummary>>, mood: string | null, notes: string | null) {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return null

  const [vitals, manualEvents] = await Promise.all([
    computeVitals(dateStr).catch(() => null),
    prisma.journalEvent.findMany({ where: { date, source: 'manual' }, select: { type: true, notes: true } }),
  ])

  const facts = [
    `Habits: ${summary.habitsDone}/${summary.habitsTotal} done${summary.habitNames.length ? ' (' + summary.habitNames.join(', ') + ')' : ''}.`,
    `Meals: ${summary.mealDescriptions.length ? summary.mealDescriptions.join(' | ') : 'none logged'}.`,
    `Workouts: ${summary.workoutDetails.length ? summary.workoutDetails.map(w => `${w.type}${w.duration ? ` ${w.duration}min` : ''}${w.avgHeartRate ? ` avgHR ${w.avgHeartRate}` : ''}`).join(', ') : 'none'}.`,
    `Water: ${summary.waterMl}ml.`,
    vitals?.recovery.status === 'ok' ? `Recovery score: ${vitals.recovery.score}%.` : null,
    vitals?.sleep ? `Sleep score: ${vitals.sleep.score}%, ${(vitals.sleep.asleepMin / 60).toFixed(1)}h asleep.` : null,
    mood ? `Mood tapped: ${mood}.` : null,
    notes ? `User's own note: "${notes}"` : null,
    manualEvents.length ? `User tagged: ${manualEvents.map(e => e.notes ? `${e.type} (${e.notes})` : e.type).join(', ')}.` : null,
  ].filter(Boolean).join('\n')

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: `Write a short (2-3 sentence), plain, first-person-observational day recap from these facts about someone's day. Also deduce a short list of life-event tags from the meal/note text where obvious (e.g. "had wine" -> "alcohol", "birthday cake" -> "sugar", "coffee at 9pm" -> "caffeine_late") — only include a tag if the text genuinely supports it, don't guess. Return ONLY JSON, no markdown: {"narrative": string, "tags": string[]}\n\n${facts}`,
        }],
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    const text = data.content?.[0]?.text ?? ''
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return null
    const parsed = JSON.parse(match[0])
    return {
      narrative: typeof parsed.narrative === 'string' ? parsed.narrative : null,
      tags: Array.isArray(parsed.tags) ? parsed.tags.filter((t: unknown) => typeof t === 'string') : [],
    }
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const dateParam = sp.get('date')

  if (dateParam) {
    const date = utcMidnight(dateParam)
    const [log, summary] = await Promise.all([
      prisma.dailyLog.findUnique({ where: { date } }),
      buildSummary(date),
    ])

    const isPastDay = date.getTime() < utcMidnight(new Date().toISOString().slice(0, 10)).getTime()
    if (isPastDay && !log?.autoNarrative) {
      const result = await generateNarrative(dateParam, date, summary, log?.mood ?? null, log?.notes ?? null)
      if (result?.narrative) {
        const updated = await prisma.dailyLog.upsert({
          where: { date },
          create: { date, autoNarrative: result.narrative, autoNarrativeGeneratedAt: new Date() },
          update: { autoNarrative: result.narrative, autoNarrativeGeneratedAt: new Date() },
        })
        if (result.tags.length) {
          await prisma.journalEvent.deleteMany({ where: { date, source: 'auto' } })
          await prisma.journalEvent.createMany({ data: result.tags.map((type: string) => ({ date, type, source: 'auto' })) })
        }
        return NextResponse.json({ log: updated, summary })
      }
    }
    return NextResponse.json({ log, summary })
  }

  // No date: recent history list
  const limit = Number(sp.get('limit') ?? 30)
  const logs = await prisma.dailyLog.findMany({ orderBy: { date: 'desc' }, take: limit })
  return NextResponse.json(logs)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { date: dateStr, mood, notes, regenerate } = body
  if (!dateStr) return NextResponse.json({ error: 'date required' }, { status: 400 })
  const date = utcMidnight(dateStr)

  if (regenerate) {
    const log = await prisma.dailyLog.update({ where: { date }, data: { autoNarrative: null, autoNarrativeGeneratedAt: null } }).catch(() => null)
    return NextResponse.json(log ?? { ok: true })
  }

  const log = await prisma.dailyLog.upsert({
    where: { date },
    create: { date, mood: mood ?? null, notes: notes ?? null },
    update: { mood: mood ?? undefined, notes: notes ?? undefined },
  })
  return NextResponse.json(log)
}
