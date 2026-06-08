export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getLiveRate } from '@/lib/utils'

export async function GET() {
  const rate = await getLiveRate()
  return NextResponse.json({ rate })
}
