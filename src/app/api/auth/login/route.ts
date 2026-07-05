export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'

// In-memory attempt tracking (per serverless instance — resets on cold start,
// but still makes brute-forcing the PIN impractical)
const attempts = new Map<string, { count: number; lockedUntil: number }>()
const MAX_ATTEMPTS = 5
const LOCKOUT_MS = 15 * 60 * 1000

export async function POST(req: NextRequest) {
  const { pin } = await req.json()

  const correctPin = process.env.APP_PIN
  const secret     = process.env.SESSION_SECRET

  if (!correctPin || !secret) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const entry = attempts.get(ip)

  if (entry && entry.lockedUntil > Date.now()) {
    const mins = Math.ceil((entry.lockedUntil - Date.now()) / 60000)
    return NextResponse.json({ error: `Too many attempts — try again in ${mins} min` }, { status: 429 })
  }

  if (pin !== correctPin) {
    const count = (entry?.count ?? 0) + 1
    attempts.set(ip, {
      count,
      lockedUntil: count >= MAX_ATTEMPTS ? Date.now() + LOCKOUT_MS : 0,
    })
    // Slow down guessing
    await new Promise(r => setTimeout(r, 500))
    return NextResponse.json({ error: 'Wrong PIN' }, { status: 401 })
  }

  attempts.delete(ip)

  const res = NextResponse.json({ ok: true })
  res.cookies.set('life_session', secret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  })
  return res
}
