export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCryptoPrices } from '@/lib/crypto'

export async function GET() {
  const holdings = await prisma.cryptoHolding.findMany()
  const symbols = Array.from(new Set(holdings.map(h => h.symbol)))
  const data = await getCryptoPrices(symbols)
  return NextResponse.json(data)
}
