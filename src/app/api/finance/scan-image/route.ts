export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'

// POST body: { image: string (base64), mediaType: string }
export async function POST(req: NextRequest) {
  const { image, mediaType = 'image/jpeg' } = await req.json()

  if (!image) return NextResponse.json({ error: 'No image provided' }, { status: 400 })

  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 500 })

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: image },
            },
            {
              type: 'text',
              text: `You are extracting data from a receipt or bill photo.
Return ONLY valid JSON with these fields (no markdown, no explanation):
{
  "merchantName": "store or company name",
  "merchantPib": "tax/VAT number if visible, else null",
  "total": total amount as a number (no currency symbol),
  "date": "ISO 8601 date string or null",
  "currency": "currency code e.g. RSD, EUR, USD"
}
If a field is not visible, use null.`,
            },
          ],
        }],
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('[scan-image] Claude error:', res.status, err)
      return NextResponse.json({ error: `Claude API error: ${res.status}` }, { status: 502 })
    }

    const data = await res.json()
    const text = data.content?.[0]?.text ?? ''

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Could not parse Claude response', raw: text }, { status: 422 })
    }

    const parsed = JSON.parse(jsonMatch[0])

    // Normalise date
    let dateISO: string | null = null
    if (parsed.date) {
      const d = new Date(parsed.date)
      if (!isNaN(d.getTime())) dateISO = d.toISOString()
    }

    return NextResponse.json({
      merchantName: parsed.merchantName ?? null,
      merchantPib:  parsed.merchantPib  ?? null,
      total:        typeof parsed.total === 'number' ? parsed.total : null,
      date:         dateISO,
      currency:     parsed.currency ?? null,
    })
  } catch (err) {
    console.error('[scan-image] error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
