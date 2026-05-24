export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const { goalId, amount, currency, date, notes } = await req.json()
  const deposit = await prisma.savingDeposit.create({
    data: { goalId, amount: +amount, currency, date: date ? new Date(date) : new Date(), notes }
  })
  return NextResponse.json(deposit)
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  await prisma.savingDeposit.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
