import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { pin } = await req.json()

  const correctPin = process.env.APP_PIN
  const secret     = process.env.SESSION_SECRET

  if (!correctPin || !secret) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
  }

  if (pin !== correctPin) {
    return NextResponse.json({ error: 'Wrong PIN' }, { status: 401 })
  }

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
