export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const count = await prisma.goalMilestone.count({ where: { goalId: params.id } })
  const milestone = await prisma.goalMilestone.create({
    data: { goalId: params.id, name: body.name, order: count },
  })
  return NextResponse.json(milestone)
}
