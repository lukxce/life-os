export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { computePatterns } from '@/lib/patterns'

export async function GET() {
  const findings = await computePatterns()
  return NextResponse.json({ findings })
}
