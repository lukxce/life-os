export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const holdings = await prisma.cryptoHolding.findMany({ orderBy: { symbol: 'asc' } })
  return NextResponse.json(holdings)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const holding = await prisma.cryptoHolding.create({
    data: { symbol: body.symbol.toUpperCase(), quantity: body.quantity }
  })
  return NextResponse.json(holding)
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { id, ...data } = body
  if (data.symbol) data.symbol = data.symbol.toUpperCase()
  const holding = await prisma.cryptoHolding.update({ where: { id }, data })
  return NextResponse.json(holding)
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  await prisma.cryptoHolding.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
