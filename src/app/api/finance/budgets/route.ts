export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const budgets = await prisma.budget.findMany({ orderBy: { category: 'asc' } })
  return NextResponse.json(budgets)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const budget = await prisma.budget.create({ data: body })
  return NextResponse.json(budget)
}

export async function PATCH(req: NextRequest) {
  const { id, ...data } = await req.json()
  const budget = await prisma.budget.update({ where: { id }, data })
  return NextResponse.json(budget)
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  await prisma.budget.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
