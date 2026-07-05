export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const habitId = searchParams.get('habitId')
  const subTasks = await prisma.habitSubTask.findMany({
    where: habitId ? { habitId } : undefined,
    orderBy: { order: 'asc' },
  })
  return NextResponse.json(subTasks)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const count = await prisma.habitSubTask.count({ where: { habitId: body.habitId } })
  const subTask = await prisma.habitSubTask.create({
    data: { habitId: body.habitId, name: body.name, order: count },
  })
  return NextResponse.json(subTask, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const { id, ...data } = await req.json()
  const subTask = await prisma.habitSubTask.update({ where: { id }, data })
  return NextResponse.json(subTask)
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  await prisma.habitSubTask.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
