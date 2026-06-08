export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import * as cheerio from 'cheerio'

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1'

// ── Date parser ───────────────────────────────────────────────────────────────
function parseReceiptDate(raw: string): Date | null {
  if (!raw) return null
  // DD.MM.YYYY HH:MM:SS or DD.MM.YYYY HH:MM
  const dmy = raw.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})\s+(\d{2}):(\d{2})(?::(\d{2}))?/)
  if (dmy) {
    const [, d, m, y, h, min, s = '00'] = dmy
    return new Date(`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}T${h}:${min}:${s}`)
  }
  const dmyOnly = raw.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/)
  if (dmyOnly) {
    const [, d, m, y] = dmyOnly
    return new Date(`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`)
  }
  const dt = new Date(raw)
  return isNaN(dt.getTime()) ? null : dt
}

// ── Amount parser ─────────────────────────────────────────────────────────────
function parseAmount(raw: string): number | null {
  if (!raw) return null
  const cleaned = raw.replace(/[^\d.,]/g, '').trim()
  if (!cleaned) return null
  if (cleaned.includes(',')) return parseFloat(cleaned.replace(/\./g, '').replace(',', '.'))
  return parseFloat(cleaned.replace(/,/g, ''))
}

// ── Selector helper ───────────────────────────────────────────────────────────
function pick($: ReturnType<typeof cheerio.load>, ...selectors: string[]): string | null {
  for (const sel of selectors) {
    try {
      const t = $(sel).first().text().trim()
      if (t) return t
    } catch {}
  }
  return null
}

// ── Text-pattern extraction ───────────────────────────────────────────────────
function extractFromText(text: string): {
  merchantName: string | null
  merchantPib: string | null
  total: number | null
  date: Date | null
} {
  // PIB: 9-digit Serbian tax number
  const pibMatch = text.match(/\bPIB[:\s]*(\d{9})\b/i) ?? text.match(/\bTIN[:\s]*(\d{9})\b/i)
  const merchantPib = pibMatch ? pibMatch[1] : null

  // Date: DD.MM.YYYY HH:MM:SS
  const dateMatch = text.match(/\d{1,2}\.\d{1,2}\.\d{4}\s+\d{2}:\d{2}(?::\d{2})?/)
  const date = dateMatch ? parseReceiptDate(dateMatch[0]) : null

  // Total: look for "Ukupan iznos" or "Total" followed by an amount
  const totalMatch =
    text.match(/Ukupan\s+iznos[:\s]+([\d.,]+)/i) ??
    text.match(/Total[:\s]+([\d.,]+)/i) ??
    text.match(/TOTAL[:\s]+([\d.,]+)/) ??
    text.match(/Iznos[:\s]+([\d.,]+)/i)
  const total = totalMatch ? parseAmount(totalMatch[1]) : null

  // Merchant name: first substantial line of text (before PIB/date)
  // Heuristic: first non-empty line that isn't purely numbers/symbols
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 3 && /[a-zA-ZšđčćžŠĐČĆŽ]/.test(l))
  const merchantName = lines.find(l =>
    !/PIB|TIN|JID|PFR|suf\.|purs\.gov|http/i.test(l) &&
    !/^\d/.test(l) &&
    l.length < 80
  ) ?? null

  return { merchantName, merchantPib, total, date }
}

// ── Claude vision fallback ─────────────────────────────────────────────────────
async function parseWithClaude(htmlText: string): Promise<{
  merchantName: string | null
  merchantPib: string | null
  total: number | null
  date: string | null
} | null> {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return null
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 256,
        messages: [{
          role: 'user',
          content: `Extract from this Serbian fiscal receipt text. Return JSON only, no markdown.
Fields: merchantName (string), merchantPib (9-digit string), total (number, RSD), date (ISO 8601 string or null).
Receipt text:
${htmlText.slice(0, 4000)}`,
        }],
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    const content = data.content?.[0]?.text ?? ''
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null
    return JSON.parse(jsonMatch[0])
  } catch {
    return null
  }
}

// ── Route ─────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const { sufUrl } = await req.json()

  if (!sufUrl || !sufUrl.includes('suf.purs.gov.rs')) {
    return NextResponse.json({ error: 'Invalid SUF URL' }, { status: 400 })
  }

  let html = ''
  let portalStatus = 0

  try {
    const res = await fetch(sufUrl, {
      headers: {
        'User-Agent': UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'sr-RS,sr;q=0.9,en-US;q=0.8',
        'Referer': 'https://suf.purs.gov.rs/',
        'Cache-Control': 'no-cache',
      },
      redirect: 'follow',
      // @ts-ignore
      next: { revalidate: 0 },
    })
    portalStatus = res.status
    html = await res.text()
  } catch (err) {
    console.error('[scan] network error:', err)
    return NextResponse.json({ error: 'Failed to reach receipt portal' }, { status: 502 })
  }

  console.log('[scan] status:', portalStatus, '| html length:', html.length)

  const $ = cheerio.load(html)

  // ── Layer 1: specific selector approach ───────────────────────────────────
  const merchantName = pick($,
    '#shopFullNameLabel', '.shop-full-name', '[class*="shopFullName"]',
    '[id*="shopFullName"]', '[class*="merchant"]', '[id*="merchant"]',
    '[class*="company"]', '[id*="company"]', '[class*="naziv"]', '[id*="naziv"]',
    'h1', 'h2',
  )

  const merchantPib = pick($,
    '#tinLabel', '.tin-label', '[id*="tin"]', '[class*="tin"]',
    '[id*="pib"]', '[class*="pib"]', '[id*="PIB"]', '[class*="PIB"]',
  )

  const dateText = pick($,
    '#sdcDateTimeLabel', '[id*="sdcDateTime"]', '[class*="dateTime"]',
    '[class*="date-time"]', '[id*="dateTime"]', '[id*="datum"]', '[class*="datum"]',
    '[id*="time"]', '[class*="time"]',
  )

  const totalText = pick($,
    '#totalAmountLabel', '[id*="totalAmount"]', '[class*="totalAmount"]',
    '[class*="total-amount"]', '[id*="total"]', '[class*="ukupan"]',
    '[id*="ukupan"]', '[class*="iznos"]', '[id*="iznos"]',
  )

  let total    = parseAmount(totalText ?? '')
  let date     = parseReceiptDate(dateText ?? '')
  let finalName = merchantName
  let finalPib  = merchantPib

  // ── Layer 2: full-text regex fallback ─────────────────────────────────────
  // Fires when selectors miss (JS-rendered portal, changed markup)
  if (!total || !date || !finalName) {
    const allText = $.text().replace(/\s+/g, ' ')
    const fromText = extractFromText(allText)
    if (!finalName)  finalName = fromText.merchantName
    if (!finalPib)   finalPib  = fromText.merchantPib
    if (!total)      total     = fromText.total
    if (!date)       date      = fromText.date
  }

  // ── Layer 3: Claude text-parsing fallback ─────────────────────────────────
  // Fires when even text extraction yields nothing (SPA with no readable content)
  if (!total || !date || !finalName) {
    const plainText = $.text().replace(/\s+/g, '\n').trim()
    if (plainText.length > 50) {
      const ai = await parseWithClaude(plainText)
      if (ai) {
        if (!finalName && ai.merchantName) finalName = ai.merchantName
        if (!finalPib  && ai.merchantPib)  finalPib  = ai.merchantPib
        if (!total     && ai.total)        total     = ai.total
        if (!date      && ai.date)         date      = parseReceiptDate(ai.date)
      }
    }
  }

  const isEmpty = !finalName && !total && !date
  if (isEmpty) {
    console.warn('[scan] All parsing layers failed. HTML length:', html.length, '| Likely JS-rendered portal.')
    return NextResponse.json({
      error: html.length < 2000
        ? 'The receipt portal returned a JavaScript app — try the "Photo" scan instead.'
        : 'Could not extract receipt data. Try the photo scan option.',
      portalStatus,
      htmlLength: html.length,
    }, { status: 422 })
  }

  return NextResponse.json({
    merchantName: finalName,
    merchantPib:  finalPib,
    total,
    date: date ? date.toISOString() : null,
    sufUrl,
  })
}
