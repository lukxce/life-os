import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const goals = await prisma.goal.findMany({
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    include: { milestones: { orderBy: { order: 'asc' } } },
  })
  return NextResponse.json(goals)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const count = await prisma.goal.count()
  const goal = await prisma.goal.create({
    data: {
      name: body.name,
      emoji: body.emoji ?? null,
      color: body.color ?? '#6366f1',
      targetDate: body.targetDate ? new Date(body.targetDate) : null,
      type: body.type ?? 'long_term',
      order: count,
    },
    include: { milestones: true },
  })
  return NextResponse.json(goal)
}
