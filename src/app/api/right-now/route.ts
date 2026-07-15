export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isScheduledDay, utcMidnight } from '@/lib/utils'
import { parseICS, type ICSEvent } from '@/lib/ics'

// ── Real, first-party data only. No invented urgency, no fake countdowns. ──
// "Now" is always the CLIENT's local clock, passed in as query params — the
// server has no business deciding what time it is for you (the habit-log
// bug earlier was exactly this mistake: server-local time silently used
// where user-local time was meant).

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
const MEAL_TIMES: Record<string, string> = { breakfast: '12:00', snack: '15:30', dinner: '19:00' }
const TRAINING_PLAN: Record<number, { activity: string; type: 'pt' | 'cardio_bike' | 'rest' }> = {
  1: { activity: 'PT Session',  type: 'pt' },
  2: { activity: 'Bike Ride',   type: 'cardio_bike' },
  3: { activity: 'PT Session',  type: 'pt' },
  4: { activity: 'Active Rest', type: 'rest' },
  5: { activity: 'PT Session',  type: 'pt' },
  6: { activity: 'Long Ride',   type: 'cardio_bike' },
  7: { activity: 'Full Rest',   type: 'rest' },
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + (m ?? 0)
}

// Boundaries match the "Still up?" / "Good morning" greeting on Home —
// 0-5am reads as still-night, not the start of a new "morning", so
// morning-only habits don't get flagged as due before you've even slept
function timeOfDayBucket(nowMin: number): string {
  if (nowMin < 5 * 60) return 'night'
  if (nowMin < 12 * 60) return 'morning'
  if (nowMin < 18 * 60) return 'noon'
  return 'night'
}

// Live external calendars (Google/Hypefy/etc, whatever's configured under
// ICSCalendar). Real events, real times — fetched with a short timeout each
// so one dead calendar can't hang the whole Right Now response. Fetched
// exactly once per request; both the near-term hero pool and the full-day
// agenda derive from this same call so Home never has to hit external
// calendar URLs a second time itself.
//
// Cache lives in the ICSCalendar row itself (cachedEvents/cachedAt), not an
// in-memory Map — a personal app gets sparse traffic, so nearly every
// request hits a fresh serverless instance and an in-memory cache almost
// never has anything in it. Persisting to the DB survives cold starts.
// Stale-while-revalidate: if we have anything under 6h old, answer with it
// immediately and refresh in the background; only a calendar with NO usable
// cache yet blocks this request on a live fetch.
const ICS_FRESH_MS = 60_000
const ICS_STALE_MS = 6 * 60 * 60 * 1000

async function refreshCalendar(cal: { id: string; url: string }): Promise<ICSEvent[]> {
  const res = await fetch(cal.url, {
    headers: { 'User-Agent': 'LifeOS/1.0' },
    signal: AbortSignal.timeout(5000),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Upstream ${res.status}`)
  const events = parseICS(await res.text())
  await prisma.iCSCalendar.update({
    where: { id: cal.id },
    data: { cachedEvents: JSON.parse(JSON.stringify(events)), cachedAt: new Date() },
  }).catch(() => {})
  return events
}

async function fetchAllIcsEvents() {
  const calendars = await prisma.iCSCalendar.findMany()
  const results = await Promise.allSettled(
    calendars.map(async cal => {
      const cachedEvents = (cal.cachedEvents as unknown as ICSEvent[] | null) ?? null
      const age = cal.cachedAt ? Date.now() - new Date(cal.cachedAt).getTime() : Infinity

      if (cachedEvents && age < ICS_FRESH_MS) {
        return cachedEvents.map(ev => ({ ...ev, color: cal.color }))
      }
      if (cachedEvents && age < ICS_STALE_MS) {
        // A bare fire-and-forget refresh isn't reliable on Vercel — the
        // function can freeze the instant the response is sent, silently
        // dropping an unawaited background task. Race it against a short
        // budget instead: fast calendars give this request fresh data (and
        // the DB write happens for real since we awaited it to win the
        // race); slow ones fall back to the still-usable stale cache rather
        // than making the user wait on them.
        const fresh = await Promise.race([
          refreshCalendar(cal).catch(() => null),
          new Promise<null>(resolve => setTimeout(() => resolve(null), 2500)),
        ])
        const use = fresh ?? cachedEvents
        return use.map(ev => ({ ...ev, color: cal.color }))
      }
      // No usable cache at all (new calendar, or nothing's succeeded in 6h)
      // — this one request has to actually wait on the live fetch.
      try {
        const events = await refreshCalendar(cal)
        return events.map(ev => ({ ...ev, color: cal.color }))
      } catch {
        return cachedEvents?.map(ev => ({ ...ev, color: cal.color })) ?? []
      }
    })
  )
  const events: (ICSEvent & { color: string })[] = []
  for (const r of results) if (r.status === 'fulfilled') events.push(...r.value)

  // Same event synced onto two subscribed calendars (e.g. accepted on both a
  // personal and work calendar) shouldn't show twice — keep the first.
  const seen = new Set<string>()
  const deduped: typeof events = []
  for (const ev of events) {
    const key = `${ev.summary}|${ev.start}|${ev.end}`
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(ev)
  }
  return deduped
}
type IcsEventWithColor = Awaited<ReturnType<typeof fetchAllIcsEvents>>[number]

// Near-term (±60 min) — feeds the general urgency pool that decides the
// hero item. Deliberately narrow: this isn't "today's agenda", just "soon".
function nearTermIcsItems(events: IcsEventWithColor[], nowMs: number) {
  const items: { id: string; kind: 'meeting'; urgency: number; title: string; detail: string; href: string }[] = []
  for (const ev of events) {
    if (ev.allDay) continue
    const startMs = new Date(ev.start).getTime()
    const endMs = new Date(ev.end).getTime()
    const diffMin = Math.round((startMs - nowMs) / 60000)
    if (nowMs >= startMs && nowMs <= endMs) {
      items.push({ id: `ics-${ev.uid}`, kind: 'meeting', urgency: 0, title: ev.summary, detail: 'happening now', href: '/schedule' })
    } else if (diffMin > 0 && diffMin <= 60) {
      items.push({ id: `ics-${ev.uid}`, kind: 'meeting', urgency: diffMin, title: ev.summary, detail: `in ${diffMin} min`, href: '/schedule' })
    }
  }
  return items
}

// The rest of today's real calendar — ICS only, nothing fabricated, nothing
// already past. This is what the Right Now card's "upcoming" strip shows.
function todaysRemainingIcsEvents(
  events: IcsEventWithColor[],
  nowMs: number,
  offsetMs: number,
  localDate: string,
): { id: string; kind: 'meeting'; urgency: number; title: string; detail: string; href: string }[] {
  const items: { id: string; kind: 'meeting'; urgency: number; title: string; detail: string; href: string }[] = []
  for (const ev of events) {
    if (ev.allDay) continue
    const startMs = new Date(ev.start).getTime()
    const endMs = new Date(ev.end).getTime()
    if (endMs <= nowMs) continue // already over
    const localDayKey = new Date(startMs + offsetMs).toISOString().slice(0, 10)
    if (localDayKey !== localDate) continue // only today, in the CLIENT's local day
    const diffMin = Math.round((startMs - nowMs) / 60000)
    const localTime = new Date(startMs + offsetMs).toISOString().slice(11, 16)
    items.push({
      id: `ics-${ev.uid}`,
      kind: 'meeting',
      urgency: diffMin,
      title: ev.summary,
      detail: nowMs >= startMs ? 'happening now' : diffMin <= 60 ? `in ${diffMin} min` : localTime,
      href: '/schedule',
    })
  }
  return items.sort((a, b) => a.urgency - b.urgency)
}

// Today's ICS-only agenda — nothing hardcoded/recurring, nothing already
// over. All-day events stay visible all day (they're not "passed" partway
// through); timed events drop off once they've ended.
function todayAgendaEvents(events: IcsEventWithColor[], nowMs: number, offsetMs: number, localDate: string) {
  const items: { id: string; time: string; minutes: number; title: string; color: string }[] = []
  for (const ev of events) {
    const startMs = new Date(ev.start).getTime()
    const localDayKey = new Date(startMs + offsetMs).toISOString().slice(0, 10)
    if (localDayKey !== localDate) continue
    if (ev.allDay) {
      items.push({ id: `ics-${ev.uid}`, time: 'All day', minutes: -1, title: ev.summary, color: ev.color })
    } else {
      const endMs = new Date(ev.end).getTime()
      if (endMs <= nowMs) continue // already over
      const localTime = new Date(startMs + offsetMs).toISOString().slice(11, 16)
      const minutes = parseInt(localTime.slice(0, 2)) * 60 + parseInt(localTime.slice(3, 5))
      items.push({ id: `ics-${ev.uid}`, time: localTime, minutes, title: ev.summary, color: ev.color })
    }
  }
  return items.sort((a, b) => a.minutes - b.minutes)
}

interface RightNowItem {
  id: string
  kind: 'meeting' | 'meal' | 'habit' | 'training'
  urgency: number // lower = sooner/more pressing
  title: string
  detail: string
  href: string
  habits?: { id: string; name: string }[] // present only for kind === 'habit' — real records to check off inline
  mealAsk?: { mealType: string; date: string } // present only when asking "did you eat X" — real records to log inline
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const now = new Date()
  // Client-local time — falls back to server time only if the caller omits it
  const localHour = sp.has('h') ? parseInt(sp.get('h')!) : now.getUTCHours()
  const localMinute = sp.has('m') ? parseInt(sp.get('m')!) : now.getUTCMinutes()
  const localDow = sp.has('dow') ? parseInt(sp.get('dow')!) : now.getUTCDay()
  const localDate = sp.get('date') ?? now.toISOString().slice(0, 10)
  // Absolute instant — needed for live ICS events (their start/end are real
  // UTC timestamps, unlike the wall-clock minutes used for schedule/meals)
  const nowMs = sp.has('ts') ? parseInt(sp.get('ts')!) : now.getTime()

  const nowMin = localHour * 60 + localMinute
  const dow = localDow || 7
  const dayKey = DAY_KEYS[localDow]
  const today = utcMidnight(localDate)
  // Client's UTC offset, derived from the wall-clock params it already sends
  // — never assumed, never read from the server's own timezone
  const [ly, lmo, ld] = localDate.split('-').map(Number)
  const offsetMs = Date.UTC(ly, lmo - 1, ld, localHour, localMinute, 0) - nowMs

  const items: RightNowItem[] = []
  const plan = TRAINING_PLAN[dow]
  const wantTrainingCheck = plan.type !== 'rest' && nowMin >= 9 * 60 && nowMin <= 20 * 60

  // Everything below is independent — one round trip instead of six serial
  // ones (this alone was adding real, visible seconds to every page load)
  const [icsEvents, blocks, meals, mealLogsToday, habits, habitLogged] = await Promise.all([
    fetchAllIcsEvents().catch(() => [] as IcsEventWithColor[]),
    prisma.scheduleBlock.findMany({ where: { day: dayKey }, orderBy: { startTime: 'asc' } }),
    prisma.mealPlanSlot.findMany({ where: { dayOfWeek: dow } }),
    prisma.mealLog.findMany({ where: { date: today } }),
    prisma.habit.findMany({
      where: { active: true, paused: false, category: { not: 'Weekly Check-in' } },
      include: { logs: { where: { date: { gte: today } }, select: { completed: true } } },
    }),
    wantTrainingCheck
      ? prisma.habitLog.findFirst({
          where: { date: { gte: today }, completed: true, habit: { name: { contains: plan.activity.split(' ')[0], mode: 'insensitive' } } },
        })
      : Promise.resolve(null),
  ])

  // ── Live calendars: your actual Google/Hypefy/etc events ──────────────────
  items.push(...nearTermIcsItems(icsEvents, nowMs))
  const upcomingCalendar = todaysRemainingIcsEvents(icsEvents, nowMs, offsetMs, localDate)
  const todayCalendarEvents = todayAgendaEvents(icsEvents, nowMs, offsetMs, localDate)

  // ── Schedule: your recurring weekly blocks — only fills gaps live events don't ──
  for (const b of blocks) {
    const start = toMinutes(b.startTime)
    const end = b.endTime ? toMinutes(b.endTime) : start + 30
    if (nowMin >= start && nowMin <= end) {
      items.push({ id: `block-${b.id}`, kind: 'meeting', urgency: 0, title: b.name, detail: 'happening now', href: '/schedule' })
    } else if (start > nowMin && start - nowMin <= 60) {
      items.push({ id: `block-${b.id}`, kind: 'meeting', urgency: start - nowMin, title: b.name, detail: `in ${start - nowMin} min`, href: '/schedule' })
    }
  }

  // ── Fitness: always know what's next to eat, not just in a narrow window ─
  const loggedMealTypes = new Set(mealLogsToday.map(l => l.mealType))

  // A meal whose window closed 60+ min ago and hasn't been logged (or
  // skipped) yet is worth actually asking about — the closest one wins.
  let askMeal: (typeof meals)[number] | null = null
  for (const meal of meals) {
    const mealTime = MEAL_TIMES[meal.mealType]
    if (!mealTime || loggedMealTypes.has(meal.mealType)) continue
    const start = toMinutes(mealTime)
    if (nowMin - start >= 60 && (!askMeal || start > toMinutes(MEAL_TIMES[askMeal.mealType]))) askMeal = meal
  }

  if (askMeal) {
    items.push({
      id: `meal-ask-${askMeal.id}`,
      kind: 'meal',
      urgency: 20,
      title: `Did you have ${askMeal.mealType}?`,
      detail: `${askMeal.name} was the plan — tell me what you actually ate`,
      href: '/fitness',
      mealAsk: { mealType: askMeal.mealType, date: localDate },
    })
  } else {
    let bestMeal: { meal: (typeof meals)[number]; start: number; diff: number; upcoming: boolean } | null = null
    for (const meal of meals) {
      const mealTime = MEAL_TIMES[meal.mealType]
      if (!mealTime) continue
      const start = toMinutes(mealTime)
      const diff = start - nowMin // positive = upcoming, negative = already open
      // Prefer the meal whose window we're closest to being inside of:
      // "just opened" (0 to +150 min ago) beats "still to come"
      const withinOpen = diff <= 0 && diff >= -150
      if (!bestMeal || withinOpen) {
        if (!bestMeal || (withinOpen && !bestMeal.upcoming) || Math.abs(diff) < Math.abs(bestMeal.diff)) {
          bestMeal = { meal, start, diff, upcoming: diff > 0 }
        }
      }
    }
    if (bestMeal) {
      const { meal, diff, upcoming } = bestMeal
      const isOpen = diff <= 0 && diff >= -150
      items.push({
        id: `meal-${meal.id}`,
        kind: 'meal',
        // Purely informational ("your window is open") — never worth more
        // than an actual actionable item like a pending habit or an unlogged
        // training session, so this stays below both (50 / 60) on purpose
        urgency: isOpen ? 70 : upcoming ? 80 + diff : 200,
        title: meal.name,
        detail: isOpen
          ? `${meal.mealType} · ${meal.calories} kcal · window's open`
          : upcoming
            ? `${meal.mealType} in ${diff > 60 ? `${Math.round(diff / 60)}h` : `${diff} min`} · ${meal.calories} kcal`
            : `${meal.mealType} · ${meal.calories} kcal`,
        href: '/fitness',
      })
    }
  }

  // ── Habits: due in the current time-of-day bucket, not yet done ──────────
  const bucket = timeOfDayBucket(nowMin)
  // Only habits genuinely scoped to THIS time block — an 'all_day' habit
  // isn't time-bound, so it shouldn't masquerade as a "morning" or "night"
  // item here (it still shows normally on the full Habits page)
  const pendingHabits = habits.filter(h =>
    isScheduledDay(h, today) &&
    h.timeOfDay === bucket &&
    !h.logs.some(l => l.completed)
  )
  if (pendingHabits.length > 0) {
    items.push({
      id: 'habits-now', kind: 'habit', urgency: 50,
      title: pendingHabits.length === 1 ? pendingHabits[0].name : `${pendingHabits.length} habits due this ${bucket}`,
      detail: 'tap to check off',
      href: '/life',
      habits: pendingHabits.map(h => ({ id: h.id, name: h.name })),
    })
  }

  // ── Training: session day, roughly workout hours, nothing logged ─────────
  if (wantTrainingCheck && !habitLogged) {
    items.push({ id: 'training-today', kind: 'training', urgency: 60, title: plan.activity, detail: 'not logged yet', href: '/fitness/workouts' })
  }

  items.sort((a, b) => a.urgency - b.urgency)

  // Mood: honest, not fabricated — either something real needs attention
  // (curious), or every habit due so far today is actually done (pleased),
  // or just steady (content). No invented composite score.
  const dueSoFar = habits.filter(h => isScheduledDay(h, today))
  const doneSoFar = dueSoFar.filter(h => h.logs.some(l => l.completed))
  const mood = items.some(i => i.urgency < 100)
    ? 'curious'
    : dueSoFar.length > 0 && doneSoFar.length === dueSoFar.length
      ? 'pleased'
      : 'content'

  const top = items[0] ?? null

  return NextResponse.json({
    top,
    // ICS-only, future-only — never the fabricated meal-plan/training items
    upcomingCalendar: upcomingCalendar.filter(i => i.id !== top?.id).slice(0, 5),
    // Today's full agenda — ICS calendars only, nothing hardcoded/recurring,
    // nothing already passed
    todayCalendarEvents,
    timeOfDay: bucket,
    mood,
  }, {
    // "force-dynamic" only stops Next's own server cache — mobile Safari in
    // particular will happily reuse a stale fetch() response without an
    // explicit no-store header, which is how a phone can end up showing an
    // old/wrong agenda while a fresh browser tab shows the current one
    headers: { 'Cache-Control': 'no-store, max-age=0, must-revalidate' },
  })
}
