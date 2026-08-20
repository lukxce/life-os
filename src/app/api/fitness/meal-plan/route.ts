export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Current plan (Aug 2026) — HOME/GRILL + per-meal cost and the exact grill
// order folded into `notes` (already a real column, already rendered under
// the meal name) rather than adding new fields for a personal one-off plan.
const DEFAULT_PLAN = [
  // Monday — Training
  { dayOfWeek: 1, mealType: 'breakfast', name: 'Omelette — 3 eggs + mozzarella 60g + prosciutto 45g', calories: 450, protein: 41, notes: null },
  { dayOfWeek: 1, mealType: 'snack',     name: '2-scoop PHD Diet Whey + 300ml milk 1.5% + fruit',    calories: 475, protein: 57, notes: null },
  { dayOfWeek: 1, mealType: 'dinner',    name: 'Vrat svinjski 200g + rice 250g cooked + Šopska salad', calories: 1165, protein: 60,
    notes: 'GRILL · 960 din · Order: Vrat svinjski na žaru — komad, 200g (480) + Šopska (480)' },
  // Tuesday — Cardio
  { dayOfWeek: 2, mealType: 'breakfast', name: 'Sandwich — 2 slices bread (142g) + ham 80g + cheese 40g + light spread', calories: 580, protein: 37, notes: null },
  { dayOfWeek: 2, mealType: 'snack',     name: '1-scoop PHD Diet Whey + 300ml milk 1.5% + fruit',    calories: 345, protein: 34, notes: null },
  { dayOfWeek: 2, mealType: 'dinner',    name: 'Pileće belo na žaru 200g + rice 300g cooked + Šopska salad', calories: 1010, protein: 78,
    notes: 'GRILL · 840 din · Order: Pileće belo na žaru — komad, 200g (360) + Šopska (480)' },
  // Wednesday — Training
  { dayOfWeek: 3, mealType: 'breakfast', name: 'Tuna 2 tins + red onion + 2 slices protein bread',   calories: 560, protein: 45, notes: null },
  { dayOfWeek: 3, mealType: 'snack',     name: '2-scoop PHD Diet Whey + 300ml milk 1.5% + fruit',    calories: 475, protein: 57, notes: null },
  { dayOfWeek: 3, mealType: 'dinner',    name: 'Pljeskavica 330g + Srpska salad (no side — burger is dense)', calories: 1080, protein: 62,
    notes: 'GRILL · 1,170 din · Order: Pljeskavica 330g (690) + Srpska (480)' },
  // Thursday — Rest
  { dayOfWeek: 4, mealType: 'breakfast', name: 'High-protein skyr bowl — 300g skyr + granola 45g + berries + honey', calories: 560, protein: 38, notes: null },
  { dayOfWeek: 4, mealType: 'snack',     name: '1-scoop PHD Diet Whey + 300ml milk 1.5% + fruit',    calories: 345, protein: 34, notes: null },
  { dayOfWeek: 4, mealType: 'dinner',    name: 'Ćureći file 200g + kobasica 120g + potato 200g cooked + Šopska salad', calories: 1200, protein: 90,
    notes: 'GRILL · 1,190 din · Order: Ćureći file 200g (450) + Kobasica — komad, 120g (260) + Šopska (480)' },
  // Friday — Training
  { dayOfWeek: 5, mealType: 'breakfast', name: 'Scrambled 3 eggs + young cheese 50g + ham 60g',       calories: 410, protein: 37, notes: null },
  { dayOfWeek: 5, mealType: 'snack',     name: '2-scoop PHD Diet Whey + 300ml milk 1.5% + fruit',    calories: 475, protein: 57, notes: null },
  { dayOfWeek: 5, mealType: 'dinner',    name: 'Ćevapi 10 komada (300g) + wedges 250g cooked + tomato salad', calories: 1145, protein: 62,
    notes: 'GRILL · 1,060 din · Order: Ćevapi 10 komada, 300g (760) + Paradajz (300)' },
  // Saturday — Cardio
  { dayOfWeek: 6, mealType: 'breakfast', name: 'Cottage cheese bowl — 250g cottage cheese + berries + nuts 30g + honey', calories: 470, protein: 33, notes: null },
  { dayOfWeek: 6, mealType: 'snack',     name: '1-scoop PHD Diet Whey + 300ml milk 1.5% + fruit',    calories: 345, protein: 34, notes: null },
  { dayOfWeek: 6, mealType: 'dinner',    name: 'Pileći file sa slaninom 210g + kobasica 120g + sweet potato 250g + green salad', calories: 1165, protein: 72,
    notes: 'GRILL · 1,000 din · Order: Pileći file sa slaninom 210g (380) + Kobasica — komad, 120g (260) + Zelena (360)' },
  // Sunday — Rest
  { dayOfWeek: 7, mealType: 'breakfast', name: 'Omelette — 3 eggs + feta 50g + spinach + 2 slices protein bread', calories: 600, protein: 38, notes: null },
  { dayOfWeek: 7, mealType: 'snack',     name: '1-scoop PHD Diet Whey + 300ml milk 1.5% + fruit',    calories: 345, protein: 34, notes: null },
  { dayOfWeek: 7, mealType: 'dinner',    name: 'Ćureći ražnjić 200g + potato 400g cooked + Šopska salad', calories: 1040, protein: 74,
    notes: 'GRILL · 880 din · Order: Ćureći ražnjić 200g (400) + Šopska (480)' },
]

// The Monday-dinner text from the PREVIOUS default plan — used as a marker
// below to detect "still on the old stock plan, safe to replace" vs
// "already updated (or hand-edited), leave it alone". Same idiom as the
// Food/Groceries category split: safe to run on every request, a no-op
// once the plan has actually changed.
const OLD_MONDAY_DINNER = 'Pork neck 310g + rice 230g cooked + salad'

export async function GET() {
  let slots = await prisma.mealPlanSlot.findMany({
    where: { userId: 'default' },
    orderBy: [{ dayOfWeek: 'asc' }, { mealType: 'asc' }],
  })

  const stillOnOldPlan = slots.length === 0 ||
    slots.find(s => s.dayOfWeek === 1 && s.mealType === 'dinner')?.name === OLD_MONDAY_DINNER

  if (stillOnOldPlan) {
    await prisma.$transaction(
      DEFAULT_PLAN.map(s => prisma.mealPlanSlot.upsert({
        where: { userId_dayOfWeek_mealType: { userId: 'default', dayOfWeek: s.dayOfWeek, mealType: s.mealType } },
        update: { name: s.name, calories: s.calories, protein: s.protein, notes: s.notes },
        create: { ...s, userId: 'default' },
      }))
    )
    slots = await prisma.mealPlanSlot.findMany({
      where: { userId: 'default' },
      orderBy: [{ dayOfWeek: 'asc' }, { mealType: 'asc' }],
    })
  }

  return NextResponse.json(slots)
}

export async function PUT(req: NextRequest) {
  const { id, name, calories, protein, notes } = await req.json()
  const cal  = Number(calories)
  const prot = Number(protein)
  const slot = await prisma.mealPlanSlot.update({
    where: { id },
    data: {
      name,
      calories: Number.isFinite(cal) ? Math.round(cal) : 0,
      protein:  Number.isFinite(prot) ? Math.round(prot) : 0,
      notes: notes || null,
    },
  })
  return NextResponse.json(slot)
}

// Adds a slot beyond the fixed breakfast/snack/dinner three (e.g. a second
// snack, a post-workout shake) — mealType is the unique-per-day key, so a
// custom one gets slugified from the name and de-duped with a numeric
// suffix if it collides, rather than requiring the caller to invent one.
export async function POST(req: NextRequest) {
  const { dayOfWeek, name, calories, protein, notes } = await req.json()
  const cal  = Number(calories) || 0
  const prot = Number(protein) || 0

  const base = (name || 'meal').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 30) || 'meal'
  let mealType = base
  let suffix = 1
  while (await prisma.mealPlanSlot.findUnique({ where: { userId_dayOfWeek_mealType: { userId: 'default', dayOfWeek, mealType } } })) {
    mealType = `${base}_${++suffix}`
  }

  const slot = await prisma.mealPlanSlot.create({
    data: { userId: 'default', dayOfWeek, mealType, name: name || 'New meal', calories: Math.round(cal), protein: Math.round(prot), notes: notes || null },
  })
  return NextResponse.json(slot)
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  await prisma.mealPlanSlot.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
