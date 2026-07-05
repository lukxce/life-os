export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { mid: string } }) {
  const body = await req.json()
  const milestone = await prisma.goalMilestone.update({
    where: { id: params.mid },
    data: {
      ...(body.completed !== undefined && { completed: body.completed }),
      ...(body.name !== undefined && { name: body.name }),
    },
  })
  return NextResponse.json(milestone)
}

export async function DELETE(_req: NextRequest, { params }: { params: { mid: string } }) {
  await prisma.goalMilestone.delete({ where: { id: params.mid } })
  return NextResponse.json({ ok: true })
}
