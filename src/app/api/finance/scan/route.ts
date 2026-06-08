export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import * as cheerio from 'cheerio'

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1'

// ── Date parser ───────────────────────────────────────────────────────────────
function parseReceiptDate(raw: string): Date | null {
  if (!raw) return null
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

// ── Try the PURS JSON API directly (bypasses JS-rendered HTML) ────────────────
async function tryPursApi(vl: string): Promise<{
  merchantName: string | null; merchantPib: string | null
  total: number | null; date: Date | null
} | null> {
  // The React SPA at suf.purs.gov.rs makes XHR calls to backend endpoints.
  // Try the most common patterns observed in the wild.
  const candidates = [
    { method: 'GET',  url: `https://suf.purs.gov.rs/v/api/fiscalData?vl=${vl}` },
    { method: 'GET',  url: `https://suf.purs.gov.rs/v/api/vl?vl=${vl}` },
    { method: 'POST', url: `https://suf.purs.gov.rs/v/api/vl`, body: JSON.stringify({ vl }) },
    { method: 'GET',  url: `https://suf.purs.gov.rs/v/api/sdr-vl/get?vl=${vl}` },
  ]

  for (const c of candidates) {
    try {
      const res = await fetch(c.url, {
        method: c.method,
        headers: {
          'User-Agent': UA,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Referer': 'https://suf.purs.gov.rs/',
          'Origin': 'https://suf.purs.gov.rs',
        },
        ...(c.body ? { body: c.body } : {}),
        // @ts-ignore
        next: { revalidate: 0 },
      })
      const ct = res.headers.get('content-type') ?? ''
      if (!res.ok || !ct.includes('json')) continue
      const data = await res.json()

      // Extract from common field name patterns
      const merchantName =
        data.shopFullName ?? data.merchantName ?? data.companyName ??
        data.naziv ?? data.shopName ?? data.seller?.name ?? null

      const merchantPib =
        data.tin ?? data.pib ?? data.taxId ?? data.seller?.tin ?? null

      const dateRaw =
        data.sdcDateTime ?? data.dateTime ?? data.date ?? data.datumVremeIzdavanja ?? null
      const date = dateRaw ? parseReceiptDate(String(dateRaw)) : null

      const totalRaw =
        data.totalAmount ?? data.total ?? data.ukupanIznos ?? data.amount ?? null
      const total = totalRaw != null ? (typeof totalRaw === 'number' ? totalRaw : parseAmount(String(totalRaw))) : null

      if (merchantName || total || date) {
        console.log('[scan] PURS API hit:', c.url)
        return { merchantName, merchantPib, total, date }
      }
    } catch {}
  }
  return null
}

// ── Cheerio selector helper ───────────────────────────────────────────────────
function pick($: ReturnType<typeof cheerio.load>, ...selectors: string[]): string | null {
  for (const sel of selectors) {
    try {
      const t = $(sel).first().text().trim()
      if (t) return t
    } catch {}
  }
  return null
}

// ── Full-text regex extraction ────────────────────────────────────────────────
function extractFromText(text: string) {
  const pibMatch = text.match(/\bPIB[:\s]*(\d{9})\b/i) ?? text.match(/\bTIN[:\s]*(\d{9})\b/i)
  const dateMatch = text.match(/\d{1,2}\.\d{1,2}\.\d{4}\s+\d{2}:\d{2}(?::\d{2})?/)
  const totalMatch =
    text.match(/Ukupan\s+iznos[:\s]+([\d.,]+)/i) ??
    text.match(/TOTAL[:\s]+([\d.,]+)/) ??
    text.match(/Iznos[:\s]+([\d.,]+)/i)
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 3 && /[a-zA-ZšđčćžŠĐČĆŽ]/.test(l))
  const merchantName = lines.find(l =>
    !/PIB|TIN|JID|PFR|suf\.|purs\.gov|http/i.test(l) && !/^\d/.test(l) && l.length < 80
  ) ?? null

  return {
    merchantName,
    merchantPib: pibMatch ? pibMatch[1] : null,
    total: totalMatch ? parseAmount(totalMatch[1]) : null,
    date: dateMatch ? parseReceiptDate(dateMatch[0]) : null,
  }
}

// ── Route ─────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const { sufUrl } = await req.json()

  if (!sufUrl || !sufUrl.includes('suf.purs.gov.rs')) {
    return NextResponse.json({ error: 'Invalid SUF URL' }, { status: 400 })
  }

  // Extract the base64 vl param
  const vl = new URL(sufUrl).searchParams.get('vl') ?? ''

  // ── Layer 1: try the PURS JSON API directly ────────────────────────────────
  if (vl) {
    const apiResult = await tryPursApi(vl)
    if (apiResult && (apiResult.merchantName || apiResult.total)) {
      return NextResponse.json({
        merchantName: apiResult.merchantName,
        merchantPib:  apiResult.merchantPib,
        total:        apiResult.total,
        date:         apiResult.date?.toISOString() ?? null,
        sufUrl,
      })
    }
  }

  // ── Layer 2: fetch HTML + cheerio selectors ────────────────────────────────
  let html = ''
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
    html = await res.text()
  } catch (err) {
    console.error('[scan] network error:', err)
  }

  console.log('[scan] html length:', html.length)

  const $ = cheerio.load(html)

  let merchantName = pick($,
    '#shopFullNameLabel', '.shop-full-name', '[class*="shopFullName"]', '[id*="shopFullName"]',
    '[class*="merchant"]', '[id*="merchant"]', '[class*="company"]', '[id*="company"]',
    '[class*="naziv"]', '[id*="naziv"]', 'h1', 'h2',
  )
  let merchantPib = pick($,
    '#tinLabel', '.tin-label', '[id*="tin"]', '[class*="tin"]',
    '[id*="pib"]', '[class*="pib"]',
  )
  let dateText  = pick($, '#sdcDateTimeLabel', '[id*="sdcDateTime"]', '[class*="dateTime"]', '[id*="datum"]')
  let totalText = pick($, '#totalAmountLabel', '[id*="totalAmount"]', '[class*="totalAmount"]', '[id*="ukupan"]', '[class*="iznos"]')

  let total = parseAmount(totalText ?? '')
  let date  = parseReceiptDate(dateText ?? '')

  // ── Layer 3: full-text regex ───────────────────────────────────────────────
  if (!total || !date || !merchantName) {
    const allText = $.text().replace(/\s+/g, ' ')
    if (allText.trim().length > 30) {
      const t = extractFromText(allText)
      if (!merchantName) merchantName = t.merchantName
      if (!merchantPib)  merchantPib  = t.merchantPib
      if (!total)        total        = t.total
      if (!date)         date         = t.date
    }
  }

  // ── Always return — let the UI show what we have and allow manual fill ─────
  const warning = (!merchantName && !total && !date)
    ? 'The receipt portal uses JavaScript rendering — fill in the details manually or use the Photo scan.'
    : null

  return NextResponse.json({
    merchantName: merchantName ?? null,
    merchantPib:  merchantPib  ?? null,
    total:        total  ?? null,
    date:         date   ? date.toISOString() : null,
    sufUrl,
    warning,
  })
}
