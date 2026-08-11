export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { utcMidnight } from '@/lib/utils'

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

  const { text, date, hour, lastLoggedMeal } = await req.json()
  if (!text?.trim()) return NextResponse.json({ error: 'text required' }, { status: 400 })

  const localDate: string = date || new Date().toISOString().slice(0, 10)
  const jsDow = new Date(localDate + 'T12:00:00Z').getUTCDay()
  const dow = jsDow === 0 ? 7 : jsDow // MealPlanSlot: 1=Mon … 7=Sun
  const todayMidnight = utcMidnight(localDate)
  const tomorrowMidnight = new Date(todayMidnight)
  tomorrowMidnight.setUTCDate(tomorrowMidnight.getUTCDate() + 1)

  const [habits, mealPlan, personalCats, businessCats, accounts, nicknames, mealLogsToday, waterAgg, habitLogsToday, tasksToday, expensesToday] = await Promise.all([
    prisma.habit.findMany({ where: { active: true, paused: false }, select: { id: true, name: true } }),
    prisma.mealPlanSlot.findMany({ where: { dayOfWeek: dow }, select: { mealType: true, name: true } }),
    prisma.category.findMany({ where: { type: 'personal' }, select: { name: true } }),
    prisma.category.findMany({ where: { type: 'business' }, select: { name: true } }),
    prisma.account.findMany({ select: { id: true, name: true, type: true, currency: true, pinned: true } }),
    prisma.merchantNickname.findMany(),
    // ── Today's actual logged data — so the model can ANSWER questions
    // about it ("how many calories so far", "did I log breakfast"), not
    // just log new things. Never invent numbers not present here.
    prisma.mealLog.findMany({ where: { date: todayMidnight }, select: { mealType: true, description: true, calories: true, protein: true } }),
    prisma.waterLog.aggregate({ where: { date: todayMidnight, drink: 'Water' }, _sum: { volumeMl: true } }),
    prisma.habitLog.findMany({ where: { date: todayMidnight, completed: true }, select: { habit: { select: { name: true } } } }),
    prisma.dailyTask.findMany({ where: { date: todayMidnight }, select: { text: true, completed: true } }),
    prisma.expenseEntry.findMany({ where: { date: { gte: todayMidnight, lt: tomorrowMidnight } }, select: { merchantName: true, category: true, subcategory: true, amount: true, currency: true, amountRSD: true } }),
  ])

  const totalCaloriesToday = mealLogsToday.reduce((s, m) => s + (m.calories ?? 0), 0)
  const totalSpendToday = expensesToday.reduce((s, e) => s + e.amountRSD, 0)
  const todaySummary = `
What's already logged today (use this — and ONLY this — to answer questions about today; never invent a number that isn't here):
- Meals: ${mealLogsToday.length ? mealLogsToday.map(m => `${m.mealType} — "${m.description ?? '(skipped)'}"${m.calories != null ? ` (${m.calories} kcal${m.protein != null ? `, ${m.protein}g protein` : ''})` : ' (no calorie estimate)'}`).join('; ') + ` — total ${totalCaloriesToday} kcal so far` : '(nothing logged yet)'}
- Water: ${waterAgg._sum.volumeMl ?? 0}ml
- Habits completed: ${habitLogsToday.length ? habitLogsToday.map(h => h.habit.name).join(', ') : '(none yet)'}
- Tasks: ${tasksToday.length ? tasksToday.map(t => `${t.completed ? 'done' : 'open'}: ${t.text}`).join('; ') : '(none)'}
- Expenses: ${expensesToday.length ? expensesToday.map(e => `${e.merchantName || e.category}${e.subcategory ? ` (${e.subcategory})` : ''} — ${e.amount} ${e.currency}`).join('; ') + ` — total ${Math.round(totalSpendToday)} RSD` : '(none)'}
`

  const systemPrompt = `You extract structured actions from a short message the user typed into their personal life-tracking app. Today is ${localDate}, current local hour is ${hour ?? 12}.

The user's actual data (use this to resolve references — don't invent names):
- Active habits: ${habits.map(h => h.name).join(', ') || '(none)'}
- Today's planned meals: ${mealPlan.map(m => `${m.mealType} (${m.name})`).join(', ') || '(none planned)'}
- Personal expense categories: ${personalCats.map(c => c.name).join(', ') || '(none)'}
- Business expense categories: ${businessCats.map(c => c.name).join(', ') || '(none)'}

Meal-type rule: this app has three meal slots — breakfast, snack, dinner (no "lunch"). If the user doesn't say which meal, infer from the current hour: before 15:00 → breakfast, 15:00–18:30 → snack, after 18:30 → dinner. An explicit meal name in the text always wins over the hour.
${todaySummary}${lastLoggedMeal ? `
The meal you JUST logged for the user, seconds ago: ${lastLoggedMeal.mealType} — "${lastLoggedMeal.description}"${lastLoggedMeal.calories != null ? ` (${lastLoggedMeal.calories} kcal${lastLoggedMeal.protein != null ? `, ${lastLoggedMeal.protein}g protein` : ''})` : ''}.
If this new message is clearly correcting that entry — wrong calorie count, wrong protein, wrong description — instead of describing a new/different meal, respond with a SINGLE "mealCorrection" action instead of a "meal" action. Only the fields being corrected should be non-null.
` : ''}
Extract ONE OR MORE actions from the message. Return ONLY a JSON array (no markdown, no explanation), each item shaped as one of:

{"type":"expense","expenseType":"personal"|"business","amount":number,"currency":"RSD"|"EUR","merchant":string|null,"category":string|null,"description":string|null}
{"type":"meal","mealType":"breakfast"|"snack"|"dinner","description":string,"calories":number|null,"protein":number|null}
{"type":"mealCorrection","calories":number|null,"protein":number|null,"description":string|null}
{"type":"water","volumeMl":number}
{"type":"habit","habitName":string}
{"type":"task","text":string}
{"type":"weight","value":number}
{"type":"mood","mood":string,"notes":string|null}
{"type":"answer","reply":string}
{"type":"unclear","originalText":string,"reason":string}

Rules:
- "habitName" must exactly match one of the active habits listed above, or use "unclear" if no confident match exists.
- "category" for expenses should match one of the listed categories if a confident match exists, else null.
- Amounts: if the user gives a bare number with no currency and no clear indication, assume RSD (this user is in Serbia).
- For meals: if the user states a calorie or protein number themselves ("about 140 calories", "20g protein"), put it in "calories"/"protein" — that's ground truth, don't second-guess it. If they don't state one, leave it null (the app estimates it separately).
- "mealCorrection" is ONLY valid when a just-logged meal was provided above — never emit it otherwise.
- If the message is a QUESTION about what's already logged today ("how many calories so far", "did I log breakfast", "what did you calculate for the mayo and cheese spread", "how much have I spent today") rather than a request to log something new, answer it directly and concisely as a single "answer" action using ONLY the today's-log data provided above. If the specific detail asked about genuinely isn't in that data, say so plainly instead of guessing a number. Use "answer", not "unclear", for any genuine question — "unclear" is only for messages where the intent itself (log vs. ask vs. correct) can't be determined at all.
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
