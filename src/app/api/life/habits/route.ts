export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const activeOnly = searchParams.get('active') === 'true'

  const habits = await prisma.habit.findMany({
    where: activeOnly ? { active: true } : undefined,
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
  })
  return NextResponse.json(habits)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const count = await prisma.habit.count()
  const habit = await prisma.habit.create({
    data: {
      name: body.name,
      category: body.category,
      type: body.type,
      unit: body.unit ?? null,
      target: body.target ? Number(body.target) : null,
      frequency: body.frequency ?? 'daily',
      frequencyDays: body.frequencyDays ?? [],
      icon: body.icon ?? null,
      color: body.color ?? null,
      order: count,
      active: body.active ?? true,
    },
  })
  return NextResponse.json(habit, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const { id, ...data } = await req.json()
  const habit = await prisma.habit.update({
    where: { id },
    data: {
      ...data,
      target: data.target !== undefined ? (data.target ? Number(data.target) : null) : undefined,
      frequencyDays: data.frequencyDays ?? undefined,
    },
  })
  return NextResponse.json(habit)
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  await prisma.habit.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
