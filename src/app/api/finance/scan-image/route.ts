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
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: image },
            },
            {
              type: 'text',
              text: `Extract data from this receipt/bill photo. Most receipts will be Serbian fiscal receipts ("fiskalni račun").

Serbian receipt hints:
- Merchant name is at the very top (often ALL CAPS company name, may end in DOO/D.O.O.)
- PIB is a 9-digit tax number, labeled "PIB:"
- The total is labeled "УКУПАН ИЗНОС" / "UKUPAN IZNOS" / "ZA UPLATU" — use THAT number, not item prices or "POVRAĆAJ"
- Dates are DD.MM.YYYY. — convert carefully (day first!)
- Amounts use comma as decimal separator: "1.234,56" means 1234.56

CRITICAL RULES:
- Only report what you can actually READ in the image. If a field is blurry, cut off, or not visible, return null for it. NEVER guess or invent values.
- If the image is not a receipt at all, return all nulls.
- For "confidence", rate how certain you are overall: "high" (all fields clearly legible), "medium" (some fields uncertain), "low" (image hard to read — user should verify everything).

Return ONLY valid JSON (no markdown, no explanation):
{
  "merchantName": string | null,
  "merchantPib": string | null,
  "total": number | null,
  "date": "ISO 8601 string" | null,
  "currency": "RSD" | "EUR" | "USD" | null,
  "confidence": "high" | "medium" | "low"
}`,
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
      confidence:   parsed.confidence ?? 'low',
    })
  } catch (err) {
    console.error('[scan-image] error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
