export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// ── The universal quick-log box ──────────────────────────────────────────
// One text box, one Haiku call. The model sees the user's actual data
// (habit names, meal slots, categories, accounts) so it maps a sentence
// like "ate eggs" to *this* app's breakfast slot, not an abstract concept.
// This route only parses + previews — nothing is saved here. The client
// dispatches each confirmed action to the existing per-module save
// endpoint, so there's exactly one place that knows how to write an
// expense/meal/habit-log/etc, and this route never duplicates that logic.

function normalize(s: string) {
  return s.toLowerCase().replace(/\s+/g, '')
}

export async function POST(req: NextRequest) {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 500 })

  const { text, date, hour } = await req.json()
  if (!text?.trim()) return NextResponse.json({ error: 'text required' }, { status: 400 })

  const localDate: string = date || new Date().toISOString().slice(0, 10)
  const jsDow = new Date(localDate + 'T12:00:00Z').getUTCDay()
  const dow = jsDow === 0 ? 7 : jsDow // MealPlanSlot: 1=Mon … 7=Sun

  const [habits, mealPlan, personalCats, businessCats, accounts, nicknames] = await Promise.all([
    prisma.habit.findMany({ where: { active: true, paused: false }, select: { id: true, name: true } }),
    prisma.mealPlanSlot.findMany({ where: { dayOfWeek: dow }, select: { mealType: true, name: true } }),
    prisma.category.findMany({ where: { type: 'personal' }, select: { name: true } }),
    prisma.category.findMany({ where: { type: 'business' }, select: { name: true } }),
    prisma.account.findMany({ select: { id: true, name: true, type: true, currency: true, pinned: true } }),
    prisma.merchantNickname.findMany(),
  ])

  const systemPrompt = `You extract structured actions from a short message the user typed into their personal life-tracking app. Today is ${localDate}, current local hour is ${hour ?? 12}.

The user's actual data (use this to resolve references — don't invent names):
- Active habits: ${habits.map(h => h.name).join(', ') || '(none)'}
- Today's planned meals: ${mealPlan.map(m => `${m.mealType} (${m.name})`).join(', ') || '(none planned)'}
- Personal expense categories: ${personalCats.map(c => c.name).join(', ') || '(none)'}
- Business expense categories: ${businessCats.map(c => c.name).join(', ') || '(none)'}

Meal-type rule: this app has three meal slots — breakfast, snack, dinner (no "lunch"). If the user doesn't say which meal, infer from the current hour: before 15:00 → breakfast, 15:00–18:30 → snack, after 18:30 → dinner. An explicit meal name in the text always wins over the hour.

Extract ONE OR MORE actions from the message. Return ONLY a JSON array (no markdown, no explanation), each item shaped as one of:

{"type":"expense","expenseType":"personal"|"business","amount":number,"currency":"RSD"|"EUR","merchant":string|null,"category":string|null,"description":string|null}
{"type":"meal","mealType":"breakfast"|"snack"|"dinner","description":string,"calories":number|null,"protein":number|null}
{"type":"water","volumeMl":number}
{"type":"habit","habitName":string}
{"type":"task","text":string}
{"type":"weight","value":number}
{"type":"mood","mood":string,"notes":string|null}
{"type":"unclear","originalText":string,"reason":string}

Rules:
- "habitName" must exactly match one of the active habits listed above, or use "unclear" if no confident match exists.
- "category" for expenses should match one of the listed categories if a confident match exists, else null.
- Amounts: if the user gives a bare number with no currency and no clear indication, assume RSD (this user is in Serbia).
- For meals: if the user states a calorie or protein number themselves ("about 140 calories", "20g protein"), put it in "calories"/"protein" — that's ground truth, don't second-guess it. If they don't state one, leave it null (the app estimates it separately).
- If a message contains multiple distinct actions ("ate eggs and spent 300 at maxi"), return one array item per action.
- Be generous about recognizing a logging intent even when phrased loosely or with typos ("i ate 2 kinder chocolates its about 140 calories" is clearly a meal — don't mark it unclear just because it's casual). Only use "unclear" when the intent genuinely can't be determined at all.

Message: "${text.trim()}"`

  let res: Response
  try {
    res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 1024,
        messages: [{ role: 'user', content: systemPrompt }],
      }),
    })
  } catch {
    return NextResponse.json({ error: 'Could not reach Claude API' }, { status: 502 })
  }

  if (!res.ok) {
    const errText = await res.text()
    console.error('[blob/command] Claude error:', res.status, errText)
    return NextResponse.json({ error: `Claude API error: ${res.status}` }, { status: 502 })
  }

  const data = await res.json()
  const raw = data.content?.[0]?.text ?? ''
  const jsonMatch = raw.match(/\[[\s\S]*\]/)
  if (!jsonMatch) return NextResponse.json({ error: 'Could not parse response', raw }, { status: 422 })

  let parsed: any[]
  try {
    parsed = JSON.parse(jsonMatch[0])
  } catch {
    return NextResponse.json({ error: 'Malformed JSON from model', raw }, { status: 422 })
  }

  const habitByName = new Map(habits.map(h => [normalize(h.name), h]))
  const personalAccount = accounts.find(a => a.type === 'personal' && a.pinned) ?? accounts.find(a => a.type === 'personal')
  const businessAccount = accounts.find(a => a.type === 'company' && a.pinned) ?? accounts.find(a => a.type === 'company')

  const actions = parsed.map((a: any) => {
    if (a.type === 'expense') {
      let category = a.category ?? null
      // Merchant memory is ground truth — override the model's category guess
      // when we've seen this merchant before.
      if (a.merchant) {
        const norm = normalize(a.merchant)
        const match = nicknames.find(n => {
          const stored = normalize(n.customName)
          return stored.length >= 3 && norm.length >= 3 && (norm.includes(stored) || stored.includes(norm))
        })
        if (match?.category) category = match.category
      }
      const account = a.expenseType === 'business' ? businessAccount : personalAccount
      return { ...a, category, accountId: account?.id ?? null, accountName: account?.name ?? null }
    }
    if (a.type === 'habit') {
      const habit = habitByName.get(normalize(a.habitName ?? ''))
      if (!habit) return { type: 'unclear', originalText: a.habitName, reason: 'No matching habit found' }
      return { type: 'habit', habitId: habit.id, habitName: habit.name }
    }
    return a
  })

  return NextResponse.json({ actions })
}
