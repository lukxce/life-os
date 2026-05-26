export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'

export async function POST(req: NextRequest) {
  const filename = req.headers.get('x-filename') || `place-photo-${Date.now()}.jpg`
  const blob = await put(`food/${filename}`, req.body!, { access: 'public' })
  return NextResponse.json({ url: blob.url })
}
