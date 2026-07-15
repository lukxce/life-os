export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { utcMidnight } from '@/lib/utils'

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get('date')
  const from = req.nextUrl.searchParams.get('from')
  const to = req.nextUrl.searchParams.get('to')

  if (date) {
    const logs = await prisma.mealLog.findMany({ where: { date: utcMidnight(date) }, orderBy: { createdAt: 'asc' } })
    return NextResponse.json(logs)
  }
  if (from && to) {
    const logs = await prisma.mealLog.findMany({
      where: { date: { gte: utcMidnight(from), lte: utcMidnight(to) } },
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
    })
    return NextResponse.json(logs)
  }
  return NextResponse.json({ error: 'Missing date, or from+to' }, { status: 400 })
}

// A quick Haiku call to turn a freeform "what did you eat" description into
// a calorie/protein estimate. Best-effort: any failure just leaves the
// fields null rather than blocking the meal log from saving — a rough
// estimate later (via re-save) beats losing the log entirely.
async function estimateNutrition(description: string): Promise<{ calories: number | null; protein: number | null }> {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return { calories: null, protein: null }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 128,
        messages: [{
          role: 'user',
          content: `Estimate the calories and protein (grams) for this meal, using typical portion sizes for an adult when not specified. Return ONLY JSON, no markdown: {"calories": number, "protein": number}\n\nMeal: "${description}"`,
        }],
      }),
    })
    if (!res.ok) return { calories: null, protein: null }
    const data = await res.json()
    const text = data.content?.[0]?.text ?? ''
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return { calories: null, protein: null }
    const parsed = JSON.parse(match[0])
    return {
      calories: typeof parsed.calories === 'number' ? Math.round(parsed.calories) : null,
      protein: typeof parsed.protein === 'number' ? Math.round(parsed.protein) : null,
    }
  } catch {
    return { calories: null, protein: null }
  }
}

// Always creates a new row — logging the same mealType again records another
// real meal (e.g. a second snack) rather than overwriting the first
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { date, mealType, description, calories: providedCalories, protein: providedProtein } = body
  if (!date || !mealType) return NextResponse.json({ error: 'Missing date or mealType' }, { status: 400 })

  const trimmed: string | null = description?.trim() || null
  // A caller (e.g. the photo-logging flow, which already ran its own vision
  // estimate) can pass calories/protein directly — skip the redundant,
  // less-accurate text-based re-estimate when that happens.
  const hasProvided = typeof providedCalories === 'number' || typeof providedProtein === 'number'
  const { calories, protein } = hasProvided
    ? {
        calories: typeof providedCalories === 'number' ? Math.round(providedCalories) : null,
        protein:  typeof providedProtein  === 'number' ? Math.round(providedProtein)  : null,
      }
    : trimmed ? await estimateNutrition(trimmed) : { calories: null, protein: null }

  const log = await prisma.mealLog.create({
    data: { date: utcMidnight(date), mealType, description: trimmed, calories, protein },
  })
  return NextResponse.json(log)
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  await prisma.mealLog.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
