import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const goal = await prisma.goal.update({
    where: { id: params.id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.emoji !== undefined && { emoji: body.emoji }),
      ...(body.color !== undefined && { color: body.color }),
      ...(body.completed !== undefined && { completed: body.completed }),
      ...(body.targetDate !== undefined && { targetDate: body.targetDate ? new Date(body.targetDate) : null }),
      ...(body.type !== undefined && { type: body.type }),
    },
    include: { milestones: { orderBy: { order: 'asc' } } },
  })
  return NextResponse.json(goal)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.goal.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
