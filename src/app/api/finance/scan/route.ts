export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import * as cheerio from 'cheerio'

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1'

// ── Date parser ───────────────────────────────────────────────────────────────
function parseReceiptDate(raw: string): Date | null {
  if (!raw) return null
  // yyyyMMddHHmmss (compact, from VL decode)
  const compact = raw.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/)
  if (compact) {
    const [, y, mo, d, h, mi, s] = compact
    return new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}`)
  }
  // DD.MM.YYYY HH:MM:SS
  const dmy = raw.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})\s+(\d{2}):(\d{2})(?::(\d{2}))?/)
  if (dmy) {
    const [, d, m, y, h, min, s = '00'] = dmy
    return new Date(`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}T${h}:${min}:${s}`)
  }
  // DD.MM.YYYY
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

// ── Decode the VL parameter directly ─────────────────────────────────────────
// Serbian fiscal QR codes encode receipt data as base64 of a pipe-delimited string:
//   TIN|BU|DC|IN|IV|IC|DT|TP|TT[|BP]
//   TIN = seller PIB, IV = total (dinars), DT = datetime yyyyMMddHHmmss
// This works completely offline — no portal fetch needed.
function decodeVl(vl: string): {
  merchantPib: string | null; total: number | null; date: Date | null
} | null {
  try {
    const decoded = Buffer.from(vl, 'base64').toString('utf8')
    // Must contain pipes to be the full data format (not just a PFR broj)
    if (!decoded.includes('|')) return null
    const parts = decoded.split('|')
    // parts[0] = TIN (PIB), parts[4] = IV (amount), parts[6] = DT (datetime)
    const merchantPib = parts[0]?.match(/^\d{9}$/) ? parts[0] : null
    const total       = parts[4] ? parseAmount(parts[4]) : null
    const date        = parts[6] ? parseReceiptDate(parts[6]) : null
    if (!total && !date && !merchantPib) return null
    console.log('[scan] VL decoded — pib:', merchantPib, 'total:', total, 'date:', date)
    return { merchantPib, total, date }
  } catch {
    return null
  }
}

// ── Try the PURS JSON API (bypasses the JS-rendered HTML) ────────────────────
async function tryPursApi(vl: string): Promise<{
  merchantName: string | null; merchantPib: string | null
  total: number | null; date: Date | null
} | null> {
  const candidates = [
    { method: 'GET',  url: `https://suf.purs.gov.rs/v/api/publicApi/checkReceipt?vl=${vl}` },
    { method: 'GET',  url: `https://suf.purs.gov.rs/v/api/vl?vl=${vl}` },
    { method: 'GET',  url: `https://suf.purs.gov.rs/v/api/fiscalData?vl=${vl}` },
    { method: 'GET',  url: `https://suf.purs.gov.rs/v/api/receipt?vl=${vl}` },
    { method: 'POST', url: `https://suf.purs.gov.rs/v/api/vl`, body: JSON.stringify({ vl }) },
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

      const merchantName = data.shopFullName ?? data.merchantName ?? data.companyName ?? data.naziv ?? data.seller?.name ?? null
      const merchantPib  = data.tin ?? data.pib ?? data.taxId ?? data.seller?.tin ?? null
      const dateRaw      = data.sdcDateTime ?? data.dateTime ?? data.date ?? null
      const date         = dateRaw ? parseReceiptDate(String(dateRaw)) : null
      const totalRaw     = data.totalAmount ?? data.total ?? data.ukupanIznos ?? null
      const total        = totalRaw != null ? (typeof totalRaw === 'number' ? totalRaw : parseAmount(String(totalRaw))) : null

      if (merchantName || total || date) {
        console.log('[scan] PURS API hit:', c.url)
        return { merchantName, merchantPib, total, date }
      }
    } catch {}
  }
  return null
}

// ── Try to discover real API from the SPA bundle ──────────────────────────────
async function tryDiscoverApi(vl: string): Promise<{
  merchantName: string | null; merchantPib: string | null
  total: number | null; date: Date | null
} | null> {
  try {
    // Fetch the SPA shell
    const shell = await fetch(`https://suf.purs.gov.rs/v/?vl=${vl}`, {
      headers: { 'User-Agent': UA },
      // @ts-ignore
      next: { revalidate: 0 },
    })
    const html = await shell.text()
    const $ = cheerio.load(html)

    // Extract script src tags to find the JS bundle
    const scripts = $('script[src]').map((_, el) => $(el).attr('src') ?? '').toArray()
    const mainBundle = scripts.find(s => s.includes('main') || s.includes('chunk') || s.includes('bundle'))
    if (!mainBundle) return null

    const bundleUrl = mainBundle.startsWith('http') ? mainBundle : `https://suf.purs.gov.rs${mainBundle}`
    const bundleRes = await fetch(bundleUrl, { headers: { 'User-Agent': UA }, // @ts-ignore
      next: { revalidate: 3600 } })
    if (!bundleRes.ok) return null
    const bundleText = await bundleRes.text()

    // Look for API path strings in the bundle
    const apiPaths: string[] = []
    const re = /["'`](\/v\/api\/[^"'`\s?]+)/g
    let match: RegExpExecArray | null
    while ((match = re.exec(bundleText)) !== null) apiPaths.push(match[1])
    const uniquePaths = Array.from(new Set(apiPaths)).slice(0, 10)
    console.log('[scan] Discovered bundle API paths:', uniquePaths)

    for (const path of uniquePaths) {
      try {
        const url = `https://suf.purs.gov.rs${path}?vl=${vl}`
        const res = await fetch(url, {
          headers: { 'User-Agent': UA, 'Accept': 'application/json', 'Referer': 'https://suf.purs.gov.rs/' },
          // @ts-ignore
          next: { revalidate: 0 },
        })
        const ct = res.headers.get('content-type') ?? ''
        if (!res.ok || !ct.includes('json')) continue
        const data = await res.json()
        const merchantName = data.shopFullName ?? data.merchantName ?? data.companyName ?? data.naziv ?? null
        const merchantPib  = data.tin ?? data.pib ?? null
        const total        = data.totalAmount ?? data.total ?? data.ukupanIznos ?? null
        const dateRaw      = data.sdcDateTime ?? data.dateTime ?? data.date ?? null
        const date         = dateRaw ? parseReceiptDate(String(dateRaw)) : null
        if (merchantName || total) {
          console.log('[scan] Discovered API hit:', url)
          return { merchantName, merchantPib, total: typeof total === 'number' ? total : parseAmount(String(total ?? '')), date }
        }
      } catch {}
    }
  } catch {}
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

// ── Route ─────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const { sufUrl } = await req.json()

  if (!sufUrl || !sufUrl.includes('suf.purs.gov.rs')) {
    return NextResponse.json({ error: 'Invalid SUF URL' }, { status: 400 })
  }

  const vl = new URL(sufUrl).searchParams.get('vl') ?? ''

  // ── Layer 1: decode VL directly — works offline, no portal needed ──────────
  if (vl) {
    const vlData = decodeVl(vl)
    if (vlData?.total || vlData?.date) {
      // We have amount+date from VL, still try portal for merchant name
      let merchantName: string | null = null
      const apiResult = await tryPursApi(vl)
      if (apiResult?.merchantName) merchantName = apiResult.merchantName

      return NextResponse.json({
        merchantName,
        merchantPib:  vlData.merchantPib ?? apiResult?.merchantPib ?? null,
        total:        vlData.total,
        date:         vlData.date?.toISOString() ?? null,
        sufUrl,
        warning: !merchantName ? 'Merchant name not found — fill in manually.' : null,
      })
    }
  }

  // ── Layer 2: try known PURS JSON API endpoints ─────────────────────────────
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

  // ── Layer 3: try discovering API from the JS bundle ────────────────────────
  if (vl) {
    const discovered = await tryDiscoverApi(vl)
    if (discovered && (discovered.merchantName || discovered.total)) {
      return NextResponse.json({
        merchantName: discovered.merchantName,
        merchantPib:  discovered.merchantPib,
        total:        discovered.total,
        date:         discovered.date?.toISOString() ?? null,
        sufUrl,
      })
    }
  }

  // ── Layer 4: HTML scraping (fallback for when portal isn't a SPA) ──────────
  let html = ''
  try {
    const res = await fetch(sufUrl, {
      headers: { 'User-Agent': UA, 'Accept': 'text/html', 'Referer': 'https://suf.purs.gov.rs/', 'Cache-Control': 'no-cache' },
      redirect: 'follow',
      // @ts-ignore
      next: { revalidate: 0 },
    })
    html = await res.text()
  } catch {}

  const $ = cheerio.load(html)
  const merchantName = pick($,
    '#shopFullNameLabel', '.shop-full-name', '[class*="shopFullName"]',
    '[class*="merchant"]', '[class*="company"]', '[class*="naziv"]', 'h1', 'h2',
  )
  const merchantPib = pick($, '#tinLabel', '[id*="tin"]', '[class*="tin"]', '[id*="pib"]', '[class*="pib"]')
  const dateText    = pick($, '#sdcDateTimeLabel', '[id*="sdcDateTime"]', '[class*="dateTime"]', '[id*="datum"]')
  const totalText   = pick($, '#totalAmountLabel', '[id*="totalAmount"]', '[class*="iznos"]', '[id*="ukupan"]')
  const total       = parseAmount(totalText ?? '')
  const date        = parseReceiptDate(dateText ?? '')

  // ── Always return — let the user fill in what's missing ───────────────────
  const allEmpty = !merchantName && !total && !date
  return NextResponse.json({
    merchantName: merchantName ?? null,
    merchantPib:  merchantPib  ?? null,
    total:        total  ?? null,
    date:         date?.toISOString() ?? null,
    sufUrl,
    warning: allEmpty
      ? 'Could not read receipt data automatically. Fill in the details below or use the Photo scan option.'
      : null,
  })
}
