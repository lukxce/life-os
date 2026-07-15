export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isScheduledDay, utcMidnight } from '@/lib/utils'

// ── Sunday-night recap, synthesized once per week and cached ───────────────
// Visible from Sunday 20:00 through the end of Monday — a real catch-up
// window, since most people don't open the app the instant it's ready — then
// disappears once Tuesday starts, seen or not. One Sonnet call per week
// (cached in WeeklyDigest), not per page load.

function dayKey(d: Date) { return d.toISOString().slice(0, 10) }

function windowRate(
  habit: { frequency: string; frequencyDays: number[]; createdAt: Date },
  logDays: Set<string>,
  start: Date,
  end: Date,
) {
  let scheduled = 0, completed = 0
  const cursor = new Date(start)
  while (cursor <= end) {
    if (new Date(habit.createdAt) <= cursor && isScheduledDay(habit, cursor)) {
      scheduled++
      if (logDays.has(dayKey(cursor))) completed++
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return { scheduled, completed }
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const now = new Date()
  const hour = sp.has('h') ? parseInt(sp.get('h')!) : now.getUTCHours()
  const localDow = sp.has('dow') ? parseInt(sp.get('dow')!) : now.getUTCDay()
  const dow = localDow || 7 // 1=Mon ... 7=Sun, same convention as right-now/nudges
  const localDate = sp.get('date') ?? now.toISOString().slice(0, 10)
  const today = utcMidnight(localDate)

  const inWindow = (dow === 7 && hour >= 20) || dow === 1
  if (!inWindow) return NextResponse.json({ digest: null })

  // The Monday..Sunday range being recapped
  const weekStart = new Date(today)
  weekStart.setUTCDate(weekStart.getUTCDate() - (dow === 7 ? 6 : 7))
  const weekEnd = new Date(weekStart)
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6)
  const prevWeekStart = new Date(weekStart)
  prevWeekStart.setUTCDate(prevWeekStart.getUTCDate() - 7)
  const prevWeekEnd = new Date(weekStart)
  prevWeekEnd.setUTCDate(prevWeekEnd.getUTCDate() - 1)

  const existing = await prisma.weeklyDigest.findUnique({ where: { weekStart } })
  if (existing) return NextResponse.json({ digest: existing.content })

  const [habits, thisWeekExpenses, prevWeekExpenses] = await Promise.all([
    prisma.habit.findMany({
      where: { active: true, paused: false, category: { not: 'Weekly Check-in' } },
      include: { logs: { where: { date: { gte: prevWeekStart, lte: weekEnd }, completed: true }, select: { date: true } } },
    }),
    prisma.expenseEntry.aggregate({ where: { date: { gte: weekStart, lte: weekEnd } }, _sum: { amountRSD: true } }),
    prisma.expenseEntry.aggregate({ where: { date: { gte: prevWeekStart, lte: prevWeekEnd } }, _sum: { amountRSD: true } }),
  ])

  let totalScheduled = 0, totalCompleted = 0
  let prevScheduled = 0, prevCompleted = 0
  const slipped: { name: string; thisPct: number; prevPct: number }[] = []
  for (const h of habits) {
    const logDays = new Set(h.logs.map(l => dayKey(new Date(l.date))))
    const thisW = windowRate(h, logDays, weekStart, weekEnd)
    const prevW = windowRate(h, logDays, prevWeekStart, prevWeekEnd)
    totalScheduled += thisW.scheduled; totalCompleted += thisW.completed
    prevScheduled += prevW.scheduled; prevCompleted += prevW.completed
    if (thisW.scheduled > 0 && prevW.scheduled > 0) {
      const thisPct = thisW.completed / thisW.scheduled
      const prevPct = prevW.completed / prevW.scheduled
      if (prevPct - thisPct >= 0.3 && prevPct >= 0.5) {
        slipped.push({ name: h.name, thisPct: Math.round(thisPct * 100), prevPct: Math.round(prevPct * 100) })
      }
    }
  }
  slipped.sort((a, b) => (b.prevPct - b.thisPct) - (a.prevPct - a.thisPct))

  // Longest currently-running streak as of the recapped week's end
  const streakLookback = new Date(weekEnd)
  streakLookback.setUTCDate(streakLookback.getUTCDate() - 90)
  const streakHabits = await prisma.habit.findMany({
    where: { active: true, paused: false, category: { not: 'Weekly Check-in' } },
    include: { logs: { where: { date: { gte: streakLookback, lte: weekEnd }, completed: true }, select: { date: true } } },
  })
  let bestStreak = { name: '', count: 0 }
  for (const h of streakHabits) {
    const logDays = new Set(h.logs.map(l => dayKey(new Date(l.date))))
    let streak = 0
    const cursor = new Date(weekEnd)
    for (let i = 0; i < 90; i++) {
      if (new Date(h.createdAt) > cursor) break
      if (isScheduledDay(h, cursor)) {
        if (logDays.has(dayKey(cursor))) streak++
        else break
      }
      cursor.setUTCDate(cursor.getUTCDate() - 1)
    }
    if (streak > bestStreak.count) bestStreak = { name: h.name, count: streak }
  }

  const thisSpend = thisWeekExpenses._sum.amountRSD ?? 0
  const prevSpend = prevWeekExpenses._sum.amountRSD ?? 0
  const habitPct = totalScheduled > 0 ? Math.round((totalCompleted / totalScheduled) * 100) : null
  const prevHabitPct = prevScheduled > 0 ? Math.round((prevCompleted / prevScheduled) * 100) : null

  let content = ''
  const key = process.env.ANTHROPIC_API_KEY
  if (key) {
    try {
      const prompt = `Write a short (2-4 sentence) weekly recap for a personal life-tracking app. Warm but plain-spoken, no fluff. Use ONLY the real numbers below — never invent anything not listed. Plain text only, no markdown, no headers, no bullet points.

Habits: ${totalCompleted}/${totalScheduled} completed this week${habitPct != null ? ` (${habitPct}%)` : ''}${prevHabitPct != null ? `, vs ${prevHabitPct}% the week before` : ''}.
Spending: ${Math.round(thisSpend).toLocaleString()} RSD this week, vs ${Math.round(prevSpend).toLocaleString()} RSD the week before.
${bestStreak.count >= 2 ? `Longest active streak: ${bestStreak.name} at ${bestStreak.count} days.\n` : ''}${slipped.length > 0 ? `Slipped vs last week: ${slipped.slice(0, 2).map(s => `${s.name} (${s.prevPct}% -> ${s.thisPct}%)`).join(', ')}.` : ''}`

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({ model: 'claude-sonnet-5', max_tokens: 300, messages: [{ role: 'user', content: prompt }] }),
      })
      if (res.ok) {
        const data = await res.json()
        content = (data.content?.[0]?.text ?? '').trim()
      }
    } catch { /* falls through to the plain-numbers version below */ }
  }

  if (!content) {
    const parts: string[] = []
    if (habitPct != null) parts.push(`Habits: ${totalCompleted}/${totalScheduled} (${habitPct}%) this week.`)
    parts.push(`Spending: ${Math.round(thisSpend).toLocaleString()} RSD vs ${Math.round(prevSpend).toLocaleString()} RSD last week.`)
    if (bestStreak.count >= 2) parts.push(`Longest streak: ${bestStreak.name} at ${bestStreak.count} days.`)
    content = parts.join(' ')
  }

  await prisma.weeklyDigest.create({ data: { weekStart, content } }).catch(() => {})
  return NextResponse.json({ digest: content })
}
