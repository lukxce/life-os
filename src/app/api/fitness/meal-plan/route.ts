export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const DEFAULT_PLAN = [
  // Monday — PT day
  { dayOfWeek: 1, mealType: 'breakfast', name: 'Omelette — 3 eggs + mozzarella 60g + prosciutto 45g', calories: 450, protein: 41 },
  { dayOfWeek: 1, mealType: 'snack',     name: '1-scoop PHD Diet Whey + 300ml milk 1.5% + fruit',    calories: 345, protein: 34 },
  { dayOfWeek: 1, mealType: 'dinner',    name: 'Pork neck 310g + rice 230g cooked + salad',           calories: 1112, protein: 74 },
  // Tuesday — Bike day
  { dayOfWeek: 2, mealType: 'breakfast', name: 'Kafeterija breakfast',                                calories: 400, protein: 20 },
  { dayOfWeek: 2, mealType: 'snack',     name: '1-scoop PHD Diet Whey + 300ml milk 1.5% + fruit',    calories: 345, protein: 34 },
  { dayOfWeek: 2, mealType: 'dinner',    name: 'Chicken thighs 330g + wedges 270g + salad',           calories: 1152, protein: 81 },
  // Wednesday — PT day
  { dayOfWeek: 3, mealType: 'breakfast', name: 'Tuna 2 tins + red onion + 2 slices protein bread',   calories: 584, protein: 39 },
  { dayOfWeek: 3, mealType: 'snack',     name: '1-scoop PHD Diet Whey + 300ml milk 1.5% + fruit',    calories: 345, protein: 34 },
  { dayOfWeek: 3, mealType: 'dinner',    name: 'Beefsteak 290g + wedges 220g + salad',               calories: 959, protein: 71 },
  // Thursday — Active rest
  { dayOfWeek: 4, mealType: 'breakfast', name: 'Kafeterija Greek yogurt bowl',                        calories: 490, protein: 19 },
  { dayOfWeek: 4, mealType: 'snack',     name: '2-scoop PHD Diet Whey + 300ml milk 1.5% + fruit',    calories: 475, protein: 57 },
  { dayOfWeek: 4, mealType: 'dinner',    name: 'Pork neck 300g + rice 175g cooked + salad',           calories: 1018, protein: 70 },
  // Friday — PT day
  { dayOfWeek: 5, mealType: 'breakfast', name: 'Sandwich x4 (double ham 150g + cheese 40g)',          calories: 504, protein: 43 },
  { dayOfWeek: 5, mealType: 'snack',     name: '1-scoop PHD Diet Whey + 300ml milk 1.5% + fruit',    calories: 345, protein: 34 },
  { dayOfWeek: 5, mealType: 'dinner',    name: 'Burger patty 320g + rice 230g cooked + salad',        calories: 1056, protein: 63 },
  // Saturday — Bike day
  { dayOfWeek: 6, mealType: 'breakfast', name: 'Kafeterija açaí bowl',                                calories: 456, protein: 9  },
  { dayOfWeek: 6, mealType: 'snack',     name: '2-scoop PHD Diet Whey + 300ml milk 1.5% + fruit',    calories: 475, protein: 57 },
  { dayOfWeek: 6, mealType: 'dinner',    name: 'Chicken thighs 330g + wedges 255g + salad',           calories: 1051, protein: 64 },
  // Sunday — Rest
  { dayOfWeek: 7, mealType: 'breakfast', name: 'Scrambled 3 eggs + young cheese 50g',                 calories: 275, protein: 25 },
  { dayOfWeek: 7, mealType: 'snack',     name: '1-scoop PHD Diet Whey + 300ml milk 1.5% + fruit',    calories: 345, protein: 34 },
  { dayOfWeek: 7, mealType: 'dinner',    name: 'Beefsteak 360g + wedges 340g + salad',               calories: 1260, protein: 89 },
]

export async function GET() {
  let slots = await prisma.mealPlanSlot.findMany({
    where: { userId: 'default' },
    orderBy: [{ dayOfWeek: 'asc' }, { mealType: 'asc' }],
  })

  // First-time seed: if no slots exist yet, create defaults
  if (slots.length === 0) {
    await prisma.mealPlanSlot.createMany({
      data: DEFAULT_PLAN.map(s => ({ ...s, userId: 'default' })),
    })
    slots = await prisma.mealPlanSlot.findMany({
      where: { userId: 'default' },
      orderBy: [{ dayOfWeek: 'asc' }, { mealType: 'asc' }],
    })
  }

  return NextResponse.json(slots)
}

export async function PUT(req: NextRequest) {
  const { id, name, calories, protein, notes } = await req.json()
  const slot = await prisma.mealPlanSlot.update({
    where: { id },
    data: { name, calories: +calories, protein: +protein, notes: notes || null },
  })
  return NextResponse.json(slot)
}
