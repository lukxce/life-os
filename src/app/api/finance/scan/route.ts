export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import * as cheerio from 'cheerio'

export async function POST(req: NextRequest) {
  const { sufUrl } = await req.json()

  if (!sufUrl || !sufUrl.includes('suf.purs.gov.rs')) {
    return NextResponse.json({ error: 'Invalid SUF URL' }, { status: 400 })
  }

  try {
    const res = await fetch(sufUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    })
    const html = await res.text()
    const $ = cheerio.load(html)

    const merchantName = $('#shopFullNameLabel').text().trim() || null
    const merchantPib = $('#tinLabel').text().trim() || null
    const dateText = $('#sdcDateTimeLabel').text().trim() || null
    const totalText = $('#totalAmountLabel').text().trim() || null

    const total = totalText
      ? parseFloat(totalText.replace(/\./g, '').replace(',', '.'))
      : null

    const date = dateText ? new Date(dateText) : null

    return NextResponse.json({
      merchantName,
      merchantPib,
      total,
      date,
      sufUrl,
    })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch receipt' }, { status: 500 })
  }
}