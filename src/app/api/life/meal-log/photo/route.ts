export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'

// POST body: { image: string (base64), mediaType: string }
// Identifies the food in a plate photo and estimates calories/protein in one
// call — Sonnet rather than Haiku here, since reading a photo (dish, portion
// size, visible ingredients) is a harder visual task than the text-based
// nutrition estimate in ../route.ts, and the cost difference at this volume
// (a few photos a day) is pennies either way.
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
        model: 'claude-sonnet-5',
        max_tokens: 256,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: image } },
            {
              type: 'text',
              text: `Identify the meal in this photo and estimate its nutrition. Use typical portion sizes for an adult based on what's visible (plate size, quantity).

Return ONLY JSON, no markdown:
{"description": string, "calories": number, "protein": number, "confidence": "high" | "medium" | "low"}

"description" should be a short, natural description of what's on the plate (e.g. "grilled chicken breast with rice and broccoli"), not a generic label.
"confidence": "high" if the food and portions are clearly visible, "medium" if partially obscured or ambiguous, "low" if it's hard to tell what's actually in the photo.
If the image doesn't show food at all, set description to null and confidence to "low".`,
            },
          ],
        }],
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('[meal-log/photo] Claude error:', res.status, err)
      return NextResponse.json({ error: `Claude API error: ${res.status}` }, { status: 502 })
    }

    const data = await res.json()
    const text = data.content?.[0]?.text ?? ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return NextResponse.json({ error: 'Could not parse Claude response', raw: text }, { status: 422 })

    const parsed = JSON.parse(jsonMatch[0])
    return NextResponse.json({
      description: parsed.description ?? null,
      calories:    typeof parsed.calories === 'number' ? Math.round(parsed.calories) : null,
      protein:     typeof parsed.protein  === 'number' ? Math.round(parsed.protein)  : null,
      confidence:  parsed.confidence ?? 'low',
    })
  } catch (err) {
    console.error('[meal-log/photo] error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
