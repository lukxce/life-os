export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { utcMidnight } from '@/lib/utils'

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get('date')
  if (!date) return NextResponse.json({ error: 'Missing date' }, { status: 400 })
  const tasks = await prisma.dailyTask.findMany({
    where: { date: utcMidnight(date) },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
  })
  return NextResponse.json(tasks, { headers: { 'Cache-Control': 'no-store, max-age=0, must-revalidate' } })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { date, text } = body
  if (!date || !text?.trim()) return NextResponse.json({ error: 'Missing date or text' }, { status: 400 })

  const day = utcMidnight(date)
  const count = await prisma.dailyTask.count({ where: { date: day } })
  const task = await prisma.dailyTask.create({
    data: { date: day, text: text.trim(), order: count },
  })
  return NextResponse.json(task)
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { id, completed, text } = body
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const data: { completed?: boolean; completedAt?: Date | null; text?: string } = {}
  if (completed !== undefined) { data.completed = completed; data.completedAt = completed ? new Date() : null }
  if (text !== undefined) data.text = text.trim()

  const task = await prisma.dailyTask.update({ where: { id }, data })
  return NextResponse.json(task)
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  await prisma.dailyTask.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
